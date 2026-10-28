DROP TABLE IF EXISTS product_variant_images;

ALTER TABLE categories
    DROP COLUMN image_url;
