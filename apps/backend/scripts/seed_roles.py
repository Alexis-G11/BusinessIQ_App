"""Fill the roles, permissions and role_permissions tables. Safe to run repeatedly."""
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.role import Permission, Role, RolePermission

PERMISSIONS = {
    "products.view": "View products",
    "products.manage": "Create, edit and archive products",
    "inventory.view": "View stock levels",
    "inventory.adjust": "Post stock adjustments",
    "customers.view": "View customers",
    "customers.manage": "Create and edit customers",
    "suppliers.view": "View suppliers",
    "suppliers.manage": "Create and edit suppliers",
    "sales.view": "View sales",
    "sales.create": "Create sales",
    "sales.refund": "Refund or void sales",
    "purchases.view": "View purchases",
    "purchases.create": "Record purchases",
    "payables.view": "View supplier payables",
    "expenses.view": "View expenses",
    "expenses.create": "Record expenses",
    "payments.record": "Record customer and supplier payments",
    "accounting.view": "View ledger and trial balance",
    "reports.view": "View reports",
    "reports.export": "Export reports",
    "analytics.view": "View analytics and forecasts",
    "imports.run": "Run bulk imports",
    "ai.use": "Use the AI assistant",
    "members.manage": "Invite and manage team members",
    "settings.manage": "Edit business settings",
    "billing.manage": "Manage subscription and billing",
    "audit.view": "View the audit log",
}
ALL = list(PERMISSIONS)

ROLES = {
    "owner": ("Full control of the business", ALL),
    "admin": ("Everything except billing", [p for p in ALL if p != "billing.manage"]),
    "manager": ("Runs operations and reports", [
        p for p in ALL
        if p not in {"members.manage", "settings.manage", "billing.manage", "audit.view"}
    ]),
    "accountant": ("Financial records and reports", [
        "products.view", "inventory.view", "customers.view", "suppliers.view",
        "sales.view", "purchases.view", "expenses.view", "expenses.create",
        "payables.view", "payments.record", "accounting.view", "reports.view", "reports.export",
        "analytics.view",
    ]),
    "employee": ("Records sales", [
        "products.view", "inventory.view", "customers.view", "sales.view",
        "sales.create", "payments.record",
    ]),
    "inventory_staff": ("Products, stock and purchases", [
        "products.view", "products.manage", "inventory.view", "inventory.adjust",
        "suppliers.view", "purchases.view", "purchases.create", "imports.run",
        "payables.view",
    ]),
    "analyst": ("Read-only analytics", [
        "products.view", "sales.view", "reports.view", "analytics.view",
    ]),
}


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        permission_ids = {}
        for code, description in PERMISSIONS.items():
            perm = await db.scalar(select(Permission).where(Permission.code == code))
            if perm is None:
                perm = Permission(code=code, description=description)
                db.add(perm)
                await db.flush()  # assigns perm.id without committing yet
            permission_ids[code] = perm.id

        for name, (description, codes) in ROLES.items():
            role = await db.scalar(select(Role).where(Role.name == name))
            if role is None:
                role = Role(name=name, description=description)
                db.add(role)
                await db.flush()
            have = set(
                (await db.execute(
                    select(RolePermission.permission_id).where(RolePermission.role_id == role.id)
                )).scalars()
            )
            for code in codes:
                if permission_ids[code] not in have:
                    db.add(RolePermission(role_id=role.id, permission_id=permission_ids[code]))

        await db.commit()
        print(f"Seeded {len(PERMISSIONS)} permissions and {len(ROLES)} roles")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())