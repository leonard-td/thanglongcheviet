INSERT INTO navigation_item (id, label, url, "order", "openInNewTab", is_active) VALUES
('nav_1', 'Trang chủ', '/', 1, false, true),
('nav_2', 'Sản phẩm', '/san-pham-list', 2, false, true),
('nav_3', 'Kiến thức', '/kien-thuc', 3, false, true),
('nav_4', 'Tin tức', '/tin-tuc', 4, false, true),
('nav_5', 'Liên hệ', '/lien-he', 5, false, true);

INSERT INTO navigation_item (id, label, url, "order", "openInNewTab", is_active, parent_id) VALUES
('nav_2_1', 'Trà đinh', '/san-pham-list?category=tra-dinh', 1, false, true, 'nav_2'),
('nav_2_2', 'Trà nõn', '/san-pham-list?category=tra-non', 2, false, true, 'nav_2'),
('nav_2_3', 'Trà móc câu', '/san-pham-list?category=tra-moc-cau', 3, false, true, 'nav_2'),
('nav_2_4', 'Trà ướp hương', '/san-pham-list?category=tra-uop-huong', 4, false, true, 'nav_2'),
('nav_2_5', 'Trà shan tuyết', '/san-pham-list?category=tra-shan-tuyet', 5, false, true, 'nav_2'),
('nav_2_6', 'Quà tặng trà', '/san-pham-list?category=qua-tang-tra', 6, false, true, 'nav_2');
