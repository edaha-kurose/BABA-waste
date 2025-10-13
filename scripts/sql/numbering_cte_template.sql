-- numbering_cte_template.sql — 採番は CTE + ROW_NUMBER
WITH max_numbers AS (
  SELECT tenant_id, COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 2) AS INTEGER)), 0) AS max_num
  FROM invoice_headers
  WHERE invoice_number ~ '^B[0-9]{6}$'
  GROUP BY tenant_id
),
monthly_rows AS (
  SELECT tenant_id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS row_num
  FROM invoice_headers_source
)
INSERT INTO invoice_headers (invoice_number, tenant_id, ...)
SELECT 'B' || LPAD((m.max_num + r.row_num)::TEXT, 6, '0'), r.tenant_id, ...
FROM monthly_rows r
LEFT JOIN max_numbers m USING (tenant_id);
