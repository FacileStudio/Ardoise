-- At most one free plan
CREATE UNIQUE INDEX "Plan_isFree_key" ON "Plan"("isFree") WHERE "isFree";
