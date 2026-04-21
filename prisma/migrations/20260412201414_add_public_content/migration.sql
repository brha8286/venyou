-- AlterTable
ALTER TABLE "events" ADD COLUMN     "flyer_url" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "public_description" TEXT,
ADD COLUMN     "public_title" TEXT,
ADD COLUMN     "ticket_url" TEXT;

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_images_key_key" ON "gallery_images"("key");
