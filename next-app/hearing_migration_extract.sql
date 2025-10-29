
> CREATE TABLE "app"."hearings" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "target_period_from" DATE NOT NULL,
      "target_period_to" DATE NOT NULL,
      "response_deadline" TIMESTAMPTZ(6) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "created_by" UUID NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_by" UUID,
      "updated_at" TIMESTAMPTZ(6),
      "deleted_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_external_stores" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "company_name" TEXT NOT NULL,
      "store_code" TEXT NOT NULL,
      "store_name" TEXT NOT NULL,
      "address" TEXT,
      "primary_collector_id" UUID,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_by" UUID NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_by" UUID,
      "updated_at" TIMESTAMPTZ(6),
      "deleted_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearing_external_stores_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
  CREATE TABLE "app"."store_items" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "store_id" UUID NOT NULL,
      "item_name" TEXT NOT NULL,
      "item_code" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "assigned_collector_id" UUID,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_by" UUID NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_by" UUID,
> CREATE TABLE "app"."hearing_external_store_items" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL,
      "external_store_id" UUID NOT NULL,
      "item_name" TEXT NOT NULL,
      "item_code" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "assigned_collector_id" UUID,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_by" UUID NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_by" UUID,
      "updated_at" TIMESTAMPTZ(6),
      "deleted_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearing_external_store_items_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_targets" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
>     "hearing_id" UUID NOT NULL,
      "collector_id" UUID NOT NULL,
      "store_id" UUID,
      "external_store_id" UUID,
      "store_item_id" UUID,
      "external_store_item_id" UUID,
      "company_name" TEXT NOT NULL,
      "store_name" TEXT NOT NULL,
      "item_name" TEXT NOT NULL,
      "notified_at" TIMESTAMPTZ(6),
      "notification_status" TEXT NOT NULL DEFAULT 'PENDING',
      "response_status" TEXT NOT NULL DEFAULT 'NOT_RESPONDED',
      "responded_at" TIMESTAMPTZ(6),
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
>     CONSTRAINT "hearing_targets_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_responses" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
>     "hearing_target_id" UUID NOT NULL,
      "target_date" DATE NOT NULL,
      "is_available" BOOLEAN NOT NULL DEFAULT false,
      "responded_by" UUID NOT NULL,
      "responded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearing_responses_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_comments" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
>     "hearing_target_id" UUID NOT NULL,
      "comment" TEXT NOT NULL,
      "user_id" UUID NOT NULL,
      "user_role" TEXT NOT NULL,
      "user_name" TEXT NOT NULL,
      "parent_comment_id" UUID,
      "is_read_by_admin" BOOLEAN NOT NULL DEFAULT false,
      "is_read_by_collector" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6),
      "deleted_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearing_comments_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_unlock_requests" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
>     "hearing_target_id" UUID NOT NULL,
      "requested_by" UUID NOT NULL,
      "request_reason" TEXT NOT NULL,
      "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "reviewed_by" UUID,
      "review_comment" TEXT,
      "reviewed_at" TIMESTAMPTZ(6),
  
>     CONSTRAINT "hearing_unlock_requests_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateTable
> CREATE TABLE "app"."hearing_reminders" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
>     "hearing_id" UUID NOT NULL,
      "collector_id" UUID NOT NULL,
      "reminder_type" TEXT NOT NULL,
      "sent_at" TIMESTAMPTZ(6),
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "error_message" TEXT,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
>     CONSTRAINT "hearing_reminders_pkey" PRIMARY KEY ("id")
  );
  
  -- CreateIndex
  CREATE UNIQUE INDEX "actuals_plan_id_key" ON "app"."actuals"("plan_id");
  
  -- CreateIndex
  CREATE INDEX "idx_actuals_org_id" ON "app"."actuals"("org_id");
  
  -- CreateIndex
  CREATE INDEX "idx_actuals_plan_id" ON "app"."actuals"("plan_id");
  
  -- CreateIndex
  CREATE INDEX "idx_actuals_plan_id_created" ON "app"."actuals"("plan_id", "created_at");
  
  -- CreateIndex
> CREATE INDEX "idx_hearings_org" ON "app"."hearings"("org_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearings_status" ON "app"."hearings"("status");
  
  -- CreateIndex
> CREATE INDEX "idx_hearings_deadline" ON "app"."hearings"("response_deadline");
  
  -- CreateIndex
> CREATE INDEX "idx_external_stores_org" ON "app"."hearing_external_stores"("org_id");
  
  -- CreateIndex
> CREATE INDEX "idx_external_stores_collector" ON "app"."hearing_external_stores"("primary_collector_id");
  
  -- CreateIndex
> CREATE UNIQUE INDEX "uk_external_store_code" ON "app"."hearing_external_stores"("org_id", "company_name", "store_code");
  
  -- CreateIndex
  CREATE INDEX "idx_store_items_org" ON "app"."store_items"("org_id");
  
  -- CreateIndex
  CREATE INDEX "idx_store_items_store" ON "app"."store_items"("store_id");
  
  -- CreateIndex
  CREATE INDEX "idx_store_items_collector" ON "app"."store_items"("assigned_collector_id");
  
  -- CreateIndex
  CREATE UNIQUE INDEX "uk_store_item_name" ON "app"."store_items"("org_id", "store_id", "item_name");
  
  -- CreateIndex
> CREATE INDEX "idx_external_store_items_org" ON "app"."hearing_external_store_items"("org_id");
  
  -- CreateIndex
> CREATE INDEX "idx_external_store_items_store" ON "app"."hearing_external_store_items"("external_store_id");
  
  -- CreateIndex
> CREATE INDEX "idx_external_store_items_collector" ON "app"."hearing_external_store_items"("assigned_collector_id");
  
  -- CreateIndex
> CREATE UNIQUE INDEX "uk_external_store_item_name" ON "app"."hearing_external_store_items"("org_id", "external_store_id", "item_name");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_targets_hearing" ON "app"."hearing_targets"("hearing_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_targets_collector" ON "app"."hearing_targets"("collector_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_targets_response_status" ON "app"."hearing_targets"("response_status");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_targets_store_item" ON "app"."hearing_targets"("store_item_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_targets_external_store_item" ON "app"."hearing_targets"("external_store_item_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_responses_target" ON "app"."hearing_responses"("hearing_target_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_responses_date" ON "app"."hearing_responses"("target_date");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_responses_available" ON "app"."hearing_responses"("is_available");
  
  -- CreateIndex
> CREATE UNIQUE INDEX "uk_hearing_response_date" ON "app"."hearing_responses"("hearing_target_id", "target_date");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_comments_target" ON "app"."hearing_comments"("hearing_target_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_comments_created" ON "app"."hearing_comments"("created_at" DESC);
  
  -- CreateIndex
> CREATE INDEX "idx_unlock_requests_target" ON "app"."hearing_unlock_requests"("hearing_target_id");
  
  -- CreateIndex
> CREATE INDEX "idx_unlock_requests_status" ON "app"."hearing_unlock_requests"("status");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_reminders_hearing" ON "app"."hearing_reminders"("hearing_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_reminders_collector" ON "app"."hearing_reminders"("collector_id");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_reminders_status" ON "app"."hearing_reminders"("status");
  
  -- CreateIndex
> CREATE INDEX "idx_hearing_reminders_type" ON "app"."hearing_reminders"("reminder_type");
  
  -- AddForeignKey
  ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app"."plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
> ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_primary_collector_id_fkey" FOREIGN KEY ("primary_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_assigned_collector_id_fkey" FOREIGN KEY ("assigned_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
  ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
> ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_external_store_id_fkey" FOREIGN KEY ("external_store_id") REFERENCES "app"."hearing_external_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_assigned_collector_id_fkey" FOREIGN KEY ("assigned_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "app"."hearings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "app"."collectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_external_store_id_fkey" FOREIGN KEY ("external_store_id") REFERENCES "app"."hearing_external_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_store_item_id_fkey" FOREIGN KEY ("store_item_id") REFERENCES "app"."store_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_external_store_item_id_fkey" FOREIGN KEY ("external_store_item_id") REFERENCES "app"."hearing_external_store_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_responses" ADD CONSTRAINT "hearing_responses_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_responses" ADD CONSTRAINT "hearing_responses_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "app"."hearing_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_reminders" ADD CONSTRAINT "hearing_reminders_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "app"."hearings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
  -- AddForeignKey
> ALTER TABLE "app"."hearing_reminders" ADD CONSTRAINT "hearing_reminders_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "app"."collectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  

