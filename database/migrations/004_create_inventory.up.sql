CREATE TABLE inventory (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    stock_on_hand INT UNSIGNED NOT NULL DEFAULT 0,
    stock_reserved INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT pk_inventory PRIMARY KEY (id),
    CONSTRAINT uq_inventory_product_variant UNIQUE (product_variant_id),
    CONSTRAINT fk_inventory_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT chk_inventory_reserved CHECK (
        stock_reserved <= stock_on_hand
    )
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE inventory_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_variant_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    stock_on_hand_before INT UNSIGNED NOT NULL,
    stock_on_hand_after INT UNSIGNED NOT NULL,
    stock_reserved_before INT UNSIGNED NOT NULL,
    stock_reserved_after INT UNSIGNED NOT NULL,
    reason VARCHAR(500) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT pk_inventory_movements PRIMARY KEY (id),
    CONSTRAINT fk_inventory_movements_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_inventory_movements_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_inventory_movements_user
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,
    CONSTRAINT chk_inventory_movements_type CHECK (
        movement_type IN (
            'RECEIPT',
            'ADJUSTMENT',
            'RESERVATION',
            'RELEASE',
            'SALE',
            'REVERSAL'
        )
    ),
    CONSTRAINT chk_inventory_movements_quantity CHECK (quantity > 0),
    CONSTRAINT chk_inventory_movements_on_hand CHECK (
        stock_on_hand_after >= 0
    ),
    CONSTRAINT chk_inventory_movements_reserved CHECK (
        stock_reserved_after <= stock_on_hand_after
    ),

    INDEX idx_inventory_movements_variant_created
        (product_variant_id, created_at, id),
    INDEX idx_inventory_movements_order (order_id, id)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
