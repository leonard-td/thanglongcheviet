-- Default active menu template + header items (2 levels max).
-- Safe to re-run only on empty DBs; otherwise use admin UI / seed script.

INSERT INTO navigation_menu (id, name, slug, is_active)
VALUES ('navm_storefront_header', 'Storefront Header', 'storefront-header', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO navigation_item (id, menu_id, label, url, "order", "openInNewTab", is_active, parent_id) VALUES
('nav_1', 'navm_storefront_header', 'Trang chủ', '/', 0, false, true, NULL),
('nav_2', 'navm_storefront_header', 'Sản phẩm', '/san-pham-list', 1, false, true, NULL),
('nav_3', 'navm_storefront_header', 'Kiến thức', '/kien-thuc', 2, false, true, NULL),
('nav_4', 'navm_storefront_header', 'Tin tức', '/tin-tuc', 3, false, true, NULL),
('nav_5', 'navm_storefront_header', 'Liên hệ', '/lien-he', 4, false, true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO navigation_item (id, menu_id, label, url, "order", "openInNewTab", is_active, parent_id) VALUES
('nav_2_1', 'navm_storefront_header', 'Trà đinh', '/san-pham-list?category=tra-dinh', 0, false, true, 'nav_2'),
('nav_2_2', 'navm_storefront_header', 'Trà nõn', '/san-pham-list?category=tra-non', 1, false, true, 'nav_2'),
('nav_2_3', 'navm_storefront_header', 'Trà móc câu', '/san-pham-list?category=tra-moc-cau', 2, false, true, 'nav_2'),
('nav_2_4', 'navm_storefront_header', 'Trà ướp hương', '/san-pham-list?category=tra-uop-huong', 3, false, true, 'nav_2'),
('nav_2_5', 'navm_storefront_header', 'Trà shan tuyết', '/san-pham-list?category=tra-shan-tuyet', 4, false, true, 'nav_2'),
('nav_2_6', 'navm_storefront_header', 'Quà tặng trà', '/san-pham-list?category=qua-tang-tra', 5, false, true, 'nav_2')
ON CONFLICT (id) DO NOTHING;
