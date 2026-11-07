import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, text, update, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.user import OrganizationInvitation, OrganizationMembershipEvent, OrganizationUser, User
from app.permissions import OrgContext, require_permission
from app.schemas.memberships import (
    InvitationAccept,
    InvitationAccepted,
    InvitationCreate,
    InvitationCreated,
    InvitationSummary,
    MembershipRoleUpdate,
    MembershipSummary,
)
from app.services.invitations import (
    INVITABLE_ROLES,
    hash_invitation_token,
    invitation_expiry,
    issue_invitation_token,
)


router = APIRouter(prefix="/api/v1/memberships", tags=["memberships"])
INVALID_INVITATION = "This invitation is invalid or expired"


@router.get("/members", response_model=list[MembershipSummary])
async def list_members(
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(OrganizationUser, User, Role.name)
        .join(User, User.id == OrganizationUser.user_id)
        .outerjoin(
            UserRole,
            (UserRole.user_id == OrganizationUser.user_id)
            & (UserRole.organization_id == OrganizationUser.organization_id),
        )
        .outerjoin(Role, Role.id == UserRole.role_id)
        .where(
            OrganizationUser.organization_id == ctx.organization_id,
            OrganizationUser.revoked_at.is_(None),
        )
        .order_by(OrganizationUser.is_owner.desc(), User.full_name, User.id)
    )
    return [
        MembershipSummary(
            id=membership.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            is_owner=membership.is_owner,
            role=role_name,
            joined_at=membership.created_at,
        )
        for membership, user, role_name in rows.all()
    ]


@router.patch("/members/{membership_id}", response_model=MembershipSummary)
async def update_member_role(
    membership_id: uuid.UUID,
    body: MembershipRoleUpdate,
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    if body.role not in INVITABLE_ROLES:
        raise HTTPException(status_code=422, detail="This role cannot be assigned through team management")
    membership = await db.scalar(
        select(OrganizationUser)
        .where(
            OrganizationUser.id == membership_id,
            OrganizationUser.organization_id == ctx.organization_id,
            OrganizationUser.revoked_at.is_(None),
        )
        .with_for_update()
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Team member not found")
    if membership.is_owner:
        raise HTTPException(status_code=409, detail="The business owner's role cannot be changed here")
    target_user = await db.get(User, membership.user_id)
    role = await db.scalar(select(Role).where(Role.name == body.role))
    if target_user is None or role is None:
        raise HTTPException(status_code=409, detail="Team member or role is unavailable")
    user_role = await db.scalar(
        select(UserRole)
        .where(
            UserRole.organization_id == ctx.organization_id,
            UserRole.user_id == membership.user_id,
        )
        .with_for_update()
    )
    previous_role_id = user_role.role_id if user_role else None
    if user_role is None:
        db.add(UserRole(user_id=membership.user_id, organization_id=ctx.organization_id, role_id=role.id))
    elif user_role.role_id != role.id:
        user_role.role_id = role.id
    if previous_role_id != role.id:
        db.add(OrganizationMembershipEvent(
            organization_id=ctx.organization_id,
            membership_id=membership.id,
            actor_user_id=ctx.user.id,
            event_type="role_changed",
            previous_role_id=previous_role_id,
            new_role_id=role.id,
        ))
    await db.commit()
    return MembershipSummary(
        id=membership.id,
        user_id=target_user.id,
        full_name=target_user.full_name,
        email=target_user.email,
        is_owner=False,
        role=role.name,
        joined_at=membership.created_at,
    )


@router.delete("/members/{membership_id}", status_code=204)
async def remove_member(
    membership_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    membership = await db.scalar(
        select(OrganizationUser)
        .where(
            OrganizationUser.id == membership_id,
            OrganizationUser.organization_id == ctx.organization_id,
            OrganizationUser.revoked_at.is_(None),
        )
        .with_for_update()
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Team member not found")
    if membership.is_owner:
        raise HTTPException(status_code=409, detail="Transfer business ownership before removing the owner")
    if membership.user_id == ctx.user.id:
        raise HTTPException(status_code=409, detail="Ask another business administrator to remove your access")
    user_role = await db.scalar(
        select(UserRole).where(
            UserRole.organization_id == ctx.organization_id,
            UserRole.user_id == membership.user_id,
        ).with_for_update()
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    membership.revoked_at = now
    membership.revoked_by_user_id = ctx.user.id
    db.add(OrganizationMembershipEvent(
        organization_id=ctx.organization_id,
        membership_id=membership.id,
        actor_user_id=ctx.user.id,
        event_type="revoked",
        previous_role_id=user_role.role_id if user_role else None,
        new_role_id=None,
    ))
    await db.commit()
    return Response(status_code=204)


@router.post("/invitations", response_model=InvitationCreated, status_code=201)
async def create_invitation(
    body: InvitationCreate,
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Create a seven-day invite; the raw token is returned once and never stored."""
    email = str(body.email).strip().lower()
    if body.role not in INVITABLE_ROLES:
        raise HTTPException(status_code=422, detail="This role cannot be assigned through an invitation")

    role = await db.scalar(select(Role).where(Role.name == body.role))
    if role is None:
        raise HTTPException(status_code=503, detail="The selected business role is unavailable")

    already_member = await db.scalar(
        select(OrganizationUser.id)
        .join(User, User.id == OrganizationUser.user_id)
        .where(
            OrganizationUser.organization_id == ctx.organization_id,
            OrganizationUser.revoked_at.is_(None),
            func.lower(User.email) == email,
        )
    )
    if already_member is not None:
        raise HTTPException(status_code=409, detail="This user already belongs to the selected business")

    # Serialize reissues for the same tenant/email so only one active invitation
    # remains even when two administrators submit concurrently.
    await db.execute(
        text("select pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"invite:{ctx.organization_id}:{email}"},
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.execute(
        update(OrganizationInvitation)
        .where(
            OrganizationInvitation.organization_id == ctx.organization_id,
            OrganizationInvitation.email == email,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
        )
        .values(revoked_at=now, revoked_by_user_id=ctx.user.id)
    )

    raw_token, token_hash = issue_invitation_token()
    invitation = OrganizationInvitation(
        organization_id=ctx.organization_id,
        email=email,
        role_id=role.id,
        invited_by_user_id=ctx.user.id,
        token_hash=token_hash,
        expires_at=invitation_expiry(now),
    )
    db.add(invitation)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An invitation could not be created; please retry") from exc
    await db.refresh(invitation)
    return InvitationCreated(
        id=invitation.id,
        email=invitation.email,
        role=body.role,
        token=raw_token,
        expires_at=invitation.expires_at,
    )


@router.get("/invitations", response_model=list[InvitationSummary])
async def list_invitations(
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(OrganizationInvitation, Role.name)
        .join(Role, Role.id == OrganizationInvitation.role_id)
        .where(OrganizationInvitation.organization_id == ctx.organization_id)
        .order_by(OrganizationInvitation.created_at.desc(), OrganizationInvitation.id)
        .limit(100)
    )
    return [
        InvitationSummary(
            id=invitation.id,
            email=invitation.email,
            role=role_name,
            invited_by_user_id=invitation.invited_by_user_id,
            accepted_by_user_id=invitation.accepted_by_user_id,
            revoked_by_user_id=invitation.revoked_by_user_id,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            revoked_at=invitation.revoked_at,
            created_at=invitation.created_at,
        )
        for invitation, role_name in rows.all()
    ]


@router.delete("/invitations/{invitation_id}", status_code=204)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    invitation = await db.scalar(
        select(OrganizationInvitation)
        .where(
            OrganizationInvitation.id == invitation_id,
            OrganizationInvitation.organization_id == ctx.organization_id,
        )
        .with_for_update()
    )
    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=409, detail="An accepted invitation cannot be revoked")
    if invitation.revoked_at is None:
        invitation.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        invitation.revoked_by_user_id = ctx.user.id
        await db.commit()
    return Response(status_code=204)


@router.post("/invitations/accept", response_model=InvitationAccepted)
async def accept_invitation(
    body: InvitationAccept,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an invite only for the authenticated, phone-verified invited email."""
    if not user.phone_verified:
        raise HTTPException(status_code=403, detail="Verify your phone before joining a business")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    invitation = await db.scalar(
        select(OrganizationInvitation)
        .where(OrganizationInvitation.token_hash == hash_invitation_token(body.token))
        .with_for_update()
    )
    if (
        invitation is None
        or invitation.accepted_at is not None
        or invitation.revoked_at is not None
        or invitation.expires_at <= now
        or invitation.email != user.email.strip().lower()
    ):
        raise HTTPException(status_code=404, detail=INVALID_INVITATION)

    if invitation.role_id is None:
        raise HTTPException(status_code=409, detail="The invited role is no longer available")
    role = await db.get(Role, invitation.role_id)
    organization = await db.get(Organization, invitation.organization_id)
    if role is None or role.name not in INVITABLE_ROLES or organization is None:
        raise HTTPException(status_code=409, detail="The invited business role is no longer available")

    existing_membership = await db.scalar(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == invitation.organization_id,
            OrganizationUser.user_id == user.id,
        ).with_for_update()
    )
    if existing_membership is not None and existing_membership.revoked_at is None:
        invitation.revoked_at = now
        invitation.revoked_by_user_id = user.id
        await db.commit()
        raise HTTPException(status_code=409, detail="You already belong to this business")
    if existing_membership is not None and existing_membership.is_owner:
        raise HTTPException(status_code=409, detail="Business owners cannot rejoin through a member invitation")

    previous_user_role = None
    if existing_membership is None:
        membership = OrganizationUser(
            organization_id=invitation.organization_id,
            user_id=user.id,
            is_owner=False,
        )
        event_type = "created"
        previous_role_id = None
        db.add(membership)
    else:
        membership = existing_membership
        event_type = "reinstated"
        existing_membership.revoked_at = None
        existing_membership.revoked_by_user_id = None
        previous_user_role = await db.scalar(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.organization_id == invitation.organization_id,
            ).with_for_update()
        )
        previous_role_id = previous_user_role.role_id if previous_user_role else None
    invitation.accepted_at = now
    invitation.accepted_by_user_id = user.id
    try:
        await db.flush()
        if existing_membership is None or previous_user_role is None:
            db.add(UserRole(user_id=user.id, organization_id=invitation.organization_id, role_id=role.id))
        else:
            previous_user_role.role_id = role.id
        db.add(OrganizationMembershipEvent(
            organization_id=invitation.organization_id,
            membership_id=membership.id,
            actor_user_id=user.id,
            event_type=event_type,
            previous_role_id=previous_role_id,
            new_role_id=role.id,
        ))
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="This invitation was already accepted") from exc

    return InvitationAccepted(
        organization_id=organization.id,
        organization_name=organization.name,
        membership_id=membership.id,
        role=role.name,
    )
