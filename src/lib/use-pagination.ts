import * as React from 'react';

export function usePagination({
  total,
  resetKey,
  pageSize = 10,
}: {
  total: number;
  resetKey: string;
  pageSize?: number;
}) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  }, [pageSize, total]);

  React.useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  return {
    page,
    setPage,
    pageSize,
    totalPages,
  };
}
