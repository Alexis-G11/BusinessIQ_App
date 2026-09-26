import uuid
from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import JournalEntry, JournalLine


class JournalLineInput:
    """Plain input shape for one line of a journal entry — not a DB model, just data passed in."""
    def __init__(
        self,
        account_id: uuid.UUID,
        debit: Decimal = Decimal("0"),
        credit: Decimal = Decimal("0"),
        description: str | None = None,
        customer_id: uuid.UUID | None = None,
        supplier_id: uuid.UUID | None = None,
        product_id: uuid.UUID | None = None,
    ):
        self.account_id = account_id
        self.debit = debit
        self.credit = credit
        self.description = description
        self.customer_id = customer_id
        self.supplier_id = supplier_id
        self.product_id = product_id


async def create_and_post_journal_entry(
    db: AsyncSession,
    organization_id: uuid.UUID,
    entry_date: date,
    lines: list[JournalLineInput],
    description: str | None = None,
    source_type: str | None = None,
    source_id: uuid.UUID | None = None,
    posted_by: uuid.UUID | None = None,
) -> JournalEntry:
    """
    The ONLY function allowed to create a posted journal entry.
    Every sale/purchase/expense/payment that affects the books calls this —
    never insert JournalEntry/JournalLine rows directly anywhere else.
    """

    # Rule 1: at least two lines
    if len(lines) < 2:
        raise HTTPException(
            status_code=400,
            detail="ACCOUNTING_ENTRY_INVALID: a journal entry must have at least two lines.",
        )

    # Rule 2: every line is debit-only or credit-only, never both, never neither
    for line in lines:
        if line.debit > 0 and line.credit > 0:
            raise HTTPException(
                status_code=400,
                detail="ACCOUNTING_ENTRY_INVALID: a line cannot have both a debit and a credit.",
            )
        if line.debit == 0 and line.credit == 0:
            raise HTTPException(
                status_code=400,
                detail="ACCOUNTING_ENTRY_INVALID: a line must have either a debit or a credit amount.",
            )

    # Rule 3: total debits must equal total credits
    total_debit = sum((line.debit for line in lines), Decimal("0"))
    total_credit = sum((line.credit for line in lines), Decimal("0"))
    if total_debit != total_credit:
        raise HTTPException(
            status_code=400,
            detail=(
                f"ACCOUNTING_ENTRY_UNBALANCED: total debits ({total_debit}) "
                f"must equal total credits ({total_credit})."
            ),
        )

    # Generate a human-readable entry number, sequential per organization
    count_result = await db.execute(
        select(func.count()).select_from(JournalEntry).where(JournalEntry.organization_id == organization_id)
    )
    next_number = count_result.scalar_one() + 1
    entry_number = f"JE-{next_number:06d}"

    entry = JournalEntry(
        organization_id=organization_id,
        entry_number=entry_number,
        entry_date=entry_date,
        description=description,
        source_type=source_type,
        source_id=source_id,
        status="posted",
        posted_by=posted_by,
    )
    db.add(entry)
    await db.flush()  # assigns entry.id without ending the transaction

    for line in lines:
        db.add(JournalLine(
            journal_entry_id=entry.id,
            account_id=line.account_id,
            description=line.description,
            debit=line.debit,
            credit=line.credit,
            customer_id=line.customer_id,
            supplier_id=line.supplier_id,
            product_id=line.product_id,
        ))

    await db.commit()
    await db.refresh(entry)
    return entry