USE dulceria_dulce_encanto;

START TRANSACTION;

-- Categorías de demostración.
INSERT INTO categories (name, slug, is_active)
VALUES
    ('Chocolates', 'chocolates', 1),
    ('Caramelos', 'caramelos', 1),
    ('Gomitas', 'gomitas', 1),
    ('Galletas', 'galletas', 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    is_active = 1;

-- Productos de demostración.
INSERT INTO products (category_id, name, description, is_active)
SELECT c.id, datos.name, datos.description, 1
FROM (
    SELECT 'chocolates' AS slug, 'Chocolate clásico' AS name,
           'Chocolate dulce para disfrutar o regalar.' AS description
    UNION ALL
    SELECT 'chocolates', 'Chocolate con leche',
           'Chocolate con leche de sabor suave.'
    UNION ALL
    SELECT 'caramelos', 'Caramelos surtidos',
           'Selección de caramelos de distintos sabores.'
    UNION ALL
    SELECT 'gomitas', 'Gomitas frutales',
           'Gomitas dulces con sabores frutales.'
    UNION ALL
    SELECT 'galletas', 'Galletas con chispas',
           'Galletas dulces con chispas de chocolate.'
) AS datos
INNER JOIN categories c ON c.slug = datos.slug
WHERE NOT EXISTS (
    SELECT 1
    FROM products p
    WHERE p.category_id = c.id
      AND p.name = datos.name
);

-- Variantes: cada SKU identifica una variante de forma única.
INSERT INTO product_variants (product_id, name, sku, price, is_active)
SELECT p.id, datos.variant_name, datos.sku, datos.price, 1
FROM (
    SELECT 'Chocolates' AS category_name, 'Chocolate clásico' AS product_name,
           'Unidad' AS variant_name, 'DEMO-CHO-001' AS sku, 0.75 AS price
    UNION ALL
    SELECT 'Chocolates', 'Chocolate con leche', 'Unidad', 'DEMO-CHO-002', 1.00
    UNION ALL
    SELECT 'Caramelos', 'Caramelos surtidos', 'Paquete pequeño', 'DEMO-CAR-001', 0.50
    UNION ALL
    SELECT 'Gomitas', 'Gomitas frutales', 'Bolsa pequeña', 'DEMO-GOM-001', 0.80
    UNION ALL
    SELECT 'Galletas', 'Galletas con chispas', 'Paquete', 'DEMO-GAL-001', 1.25
) AS datos
INNER JOIN categories c ON c.name = datos.category_name
INNER JOIN products p
    ON p.category_id = c.id
   AND p.name = datos.product_name
WHERE NOT EXISTS (
    SELECT 1
    FROM product_variants pv
    WHERE pv.sku = datos.sku
);

-- Inventario inicial para las variantes de demostración.
INSERT INTO inventory (product_variant_id, stock_on_hand, stock_reserved)
SELECT pv.id, datos.stock, 0
FROM (
    SELECT 'DEMO-CHO-001' AS sku, 30 AS stock
    UNION ALL SELECT 'DEMO-CHO-002', 25
    UNION ALL SELECT 'DEMO-CAR-001', 40
    UNION ALL SELECT 'DEMO-GOM-001', 35
    UNION ALL SELECT 'DEMO-GAL-001', 20
) AS datos
INNER JOIN product_variants pv ON pv.sku = datos.sku
ON DUPLICATE KEY UPDATE
    product_variant_id = VALUES(product_variant_id);

COMMIT;

-- Verificación de los datos cargados.
SELECT
    c.name AS categoria,
    p.name AS producto,
    pv.name AS variante,
    pv.sku,
    pv.price AS precio_usd,
    COALESCE(i.stock_on_hand - i.stock_reserved, 0) AS stock_disponible
FROM products p
INNER JOIN categories c ON c.id = p.category_id
INNER JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN inventory i ON i.product_variant_id = pv.id
WHERE pv.sku LIKE 'DEMO-%'
ORDER BY c.name, p.name;
