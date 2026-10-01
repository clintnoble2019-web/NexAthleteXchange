-- Apply to the isolated customer test schema after its tables exist.
-- Repeatable constraints; no balance or history rewrites.
DO $$
DECLARE item record; table_name text;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('ScoutWallet', 'scout_wallet_backing', '"balance" >= 0 AND "reservedCash" >= 0 AND "reservedCash" <= "balance"'),
    ('ScoutPosition', 'scout_position_backing', '"quantity" >= 0 AND "reservedQuantity" >= 0 AND "reservedQuantity" <= "quantity" AND "costBasis" >= 0'),
    ('ScoutOrder', 'scout_order_backing', '"price" > 0 AND "quantity" > 0 AND "remaining" >= 0 AND "remaining" <= "quantity" AND "cashHold" >= 0 AND "feePaid" IN (0, 2) AND ("status" NOT IN (''FILLED'', ''CANCELED'') OR "cashHold" = 0) AND ("status" <> ''FILLED'' OR "remaining" = 0)'),
    ('ScoutFill', 'scout_fill_value', '"quantity" > 0 AND "price" > 0 AND "gross" > 0 AND "buyFee" IN (0, 2) AND "sellFee" IN (0, 2) AND "buyOrderId" <> "sellOrderId"'),
    ('ScoutCashTransfer', 'scout_cash_value', '"amount" > 0'),
    ('ScoutInventoryGrant', 'scout_grant_value', '"quantity" = 10')
  ) AS checks(table_name, constraint_name, expression)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = item.constraint_name AND conrelid = format('%I', item.table_name)::regclass) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', item.table_name, item.constraint_name, item.expression);
    END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['ScoutWallet','ScoutPosition','ScoutOrder','ScoutFill','ScoutLedgerEntry','ScoutCashTransfer','ScoutInventoryGrant'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scout_sandbox_only' AND conrelid = format('%I', table_name)::regclass) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT scout_sandbox_only CHECK ("environment" = ''SANDBOX'')', table_name);
    END IF;
  END LOOP;
END $$;
