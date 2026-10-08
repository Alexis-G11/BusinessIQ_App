import uuid

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    # Supabase's pooler shares connections between clients, so we must not rely on
    # named prepared statements living on "our" connection.
    connect_args={
        "statement_cache_size": 0,           # asyncpg's own statement cache
        "prepared_statement_cache_size": 0,  # SQLAlchemy's cache for the asyncpg driver
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",  # unique names
    },
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session