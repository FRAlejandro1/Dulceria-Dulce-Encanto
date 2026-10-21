ALTER TABLE products
    ADD COLUMN image_url VARCHAR(2048) NULL
    AFTER description;

ALTER TABLE product_variants
    ADD COLUMN image_url VARCHAR(2048) NULL
    AFTER sku;
