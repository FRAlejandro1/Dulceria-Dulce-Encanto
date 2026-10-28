ALTER TABLE categories
    ADD COLUMN image_url VARCHAR(2048) NULL
    AFTER slug;

CREATE TABLE product_variant_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    position TINYINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT pk_product_variant_images PRIMARY KEY (id),
    CONSTRAINT fk_product_variant_images_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT uq_variant_image_position
        UNIQUE (product_variant_id, position),
    CONSTRAINT chk_variant_image_position
        CHECK (position BETWEEN 1 AND 3),

    INDEX idx_variant_images_order
        (product_variant_id, position, id)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
