"""Asynchronous Document Background Job Manager.

Provides a thread-safe, bounded worker queue (max 2 concurrent heavy workers)
for generating heavy PDFs, reports, and large Excel exports without blocking the FastAPI event loop
or freezing the desktop UI thread.
"""

from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger("skybol.documents.jobs")


@dataclass
class DocumentJob:
    job_id: str
    doc_type: str
    status: str = "queued"  # queued, processing, completed, failed
    progress: int = 0       # 0 - 100%
    result: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    completed_at: str | None = None
    dedup_key: str | None = None


class DocumentJobManager:
    """Thread-safe background job scheduler for document generation."""

    _instance: DocumentJobManager | null = None

    def __init__(self, max_workers: int = 2):
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="doc-worker")
        self._jobs: dict[str, DocumentJob] = {}
        self._active_dedup_keys: dict[str, str] = {}  # dedup_key -> job_id
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> DocumentJobManager:
        if cls._instance is None:
            cls._instance = DocumentJobManager(max_workers=2)
        return cls._instance

    async def submit_job(
        self,
        doc_type: str,
        work_fn: Callable[..., dict[str, Any]],
        *args: Any,
        dedup_key: str | None = None,
        **kwargs: Any,
    ) -> DocumentJob:
        """Submit heavy document work to the background thread pool."""
        async with self._lock:
            # Prevent duplicate jobs if identical generation is already in-flight
            if dedup_key and dedup_key in self._active_dedup_keys:
                existing_id = self._active_dedup_keys[dedup_key]
                if existing_id in self._jobs:
                    existing_job = self._jobs[existing_id]
                    if existing_job.status in ("queued", "processing"):
                        logger.info(f"Reusing in-flight job {existing_id} for key {dedup_key}")
                        return existing_job

            job_id = f"job-{uuid.uuid4().hex[:12]}"
            job = DocumentJob(
                job_id=job_id,
                doc_type=doc_type,
                status="queued",
                progress=5,
                dedup_key=dedup_key,
            )
            self._jobs[job_id] = job
            if dedup_key:
                self._active_dedup_keys[dedup_key] = job_id

        # Schedule execution
        asyncio.create_task(self._run_job(job, work_fn, args, kwargs))
        return job

    async def _run_job(
        self,
        job: DocumentJob,
        work_fn: Callable[..., dict[str, Any]],
        args: tuple,
        kwargs: dict,
    ):
        """Execute the job in the worker pool and track lifecycle."""
        loop = asyncio.get_running_loop()
        job.status = "processing"
        job.progress = 25

        try:
            # Run blocking CPU/PDF work in worker thread
            result = await loop.run_in_executor(self._executor, lambda: work_fn(*args, **kwargs))
            job.status = "completed"
            job.progress = 100
            job.result = result
            job.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            logger.info(f"Document job {job.job_id} ({job.doc_type}) completed successfully.")
        except Exception as exc:
            job.status = "failed"
            job.progress = 100
            job.error_message = "Document generation encountered an internal error. Please verify input data."
            job.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            logger.error(f"Document job {job.job_id} failed: {exc}", exc_info=True)
        finally:
            if job.dedup_key and job.dedup_key in self._active_dedup_keys:
                del self._active_dedup_keys[job.dedup_key]

    def get_job(self, job_id: str) -> DocumentJob | None:
        return self._jobs.get(job_id)

    def prune_old_jobs(self, max_keep: int = 100):
        """Clean finished jobs memory to keep RAM bounded."""
        if len(self._jobs) > max_keep:
            sorted_keys = sorted(self._jobs.keys(), key=lambda k: self._jobs[k].created_at)
            for k in sorted_keys[:-max_keep]:
                del self._jobs[k]


job_manager = DocumentJobManager.get_instance()
