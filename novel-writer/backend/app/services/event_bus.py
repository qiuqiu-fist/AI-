import asyncio
from typing import Dict


class EventBus:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._queues: Dict[int, asyncio.Queue] = {}
        return cls._instance

    def subscribe(self, book_id: int) -> asyncio.Queue:
        if book_id not in self._queues:
            self._queues[book_id] = asyncio.Queue()
        return self._queues[book_id]

    def unsubscribe(self, book_id: int):
        self._queues.pop(book_id, None)

    async def publish(self, book_id: int, event: str, data: dict):
        queue = self._queues.get(book_id)
        if queue is not None:
            await queue.put((event, data))