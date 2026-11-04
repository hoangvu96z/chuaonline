-- ====================================================================
-- NHÀ THỜ CÔNG GIÁO ONLINE 3D - DATABASE INITIALIZATION SCHEMA
-- High-CCU Virtual Catholic Cathedral & Rosary Sanctuary System
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------
-- 1. TABLE: nhatho_users (Catholic Faithful Accounts & Spiritual Bouquet)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nhatho_users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recovery_code VARCHAR(64) UNIQUE NOT NULL,       -- Mã Khôi Phục Tín Hữu (VD: TINHUU-XXXX-XXXX)
  christian_name VARCHAR(50) NOT NULL,             -- Tên Thánh & Họ Tên (VD: "Giuse Nguyễn An")
  password_hash VARCHAR(128) DEFAULT NULL,         -- SHA-256 Password Hash bảo hộ tài khoản
  outfit_color VARCHAR(16) DEFAULT '#f5f0e6',      -- Màu lễ phục / trang phục giáo dân
  avatar_style VARCHAR(32) DEFAULT 'GIAO_DAN_AO_DAI', -- Kiểu nhân vật 3D
  diocese_code VARCHAR(10) DEFAULT 'SG',           -- Mã Giáo Phận (27 Giáo phận Việt Nam)
  grace_points BIGINT DEFAULT 0,                   -- Điểm Hoa Thiêng (Spiritual Bouquet / Ân Sủng)
  rosaries_completed INT DEFAULT 0,                -- Số Chuỗi Mân Côi & Giờ Kinh đã hoàn thành
  garden_tended INT DEFAULT 0,                     -- Số khóm hoa Vườn Mân Côi đã chăm sóc
  virtue_tier INT DEFAULT 1,                       -- Cấp bậc Hoa Thiêng (1 -> 9)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_grace_leaderboard (grace_points DESC),
  INDEX idx_diocese (diocese_code, grace_points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. TABLE: prayer_intentions (Nến Cầu Nguyện & Hoa Hồng Dâng Mẹ)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_intentions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  christian_name VARCHAR(50) NOT NULL,
  intention_type ENUM('CANDLE', 'ROSE') NOT NULL,  -- Thắp Nến Cầu Nguyện hoặc Dâng Hoa Hồng Đức Mẹ
  content VARCHAR(200) NOT NULL,
  pos_x FLOAT DEFAULT 0,
  pos_z FLOAT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,                   -- Tự động ẩn sau 24h để giữ hiệu năng 3D
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active_intentions (intention_type, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. TABLE: diocese_bouquets (27 Giáo Phận Việt Nam - Bảng Hiệp Thông)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diocese_bouquets (
  diocese_code VARCHAR(10) PRIMARY KEY,
  diocese_name VARCHAR(60) NOT NULL,
  ecclesiastical_province ENUM('BẮC', 'TRUNG', 'NAM') DEFAULT 'NAM', -- Giáo tỉnh Hà Nội / Huế / Sài Gòn
  total_grace BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. TABLE: daily_scriptures (Lộc Thánh Lời Chúa Mỗi Ngày)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_scriptures (
  id INT PRIMARY KEY,
  theme_title VARCHAR(80) NOT NULL,                -- Chủ đề (VD: "Bình An Trong Tay Chúa")
  bible_verse TEXT NOT NULL,                       -- Câu Kinh Thánh (VD: "Thầy để lại bình an cho anh em...")
  reference_book VARCHAR(50) NOT NULL,             -- Trích dẫn (VD: "Gioan 14:27")
  reflection TEXT NOT NULL                         -- Lời suy niệm & thực hành bác ái trong ngày
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. TABLE: prayer_catalog (Kho Tàng Kinh Nguyện & Chuỗi Mân Côi)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_catalog (
  id VARCHAR(40) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  duration_sec INT NOT NULL,
  grace_reward INT NOT NULL,
  verses_json JSON NOT NULL                        -- [{ "text": "...", "chime": true, "beadType": "AVE" }]
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED DATA: 27 DIOCESES OF VIETNAM (GIÁO TỈNH HÀ NỘI, HUẾ, SÀI GÒN)
-- ====================================================================
INSERT IGNORE INTO diocese_bouquets (diocese_code, diocese_name, ecclesiastical_province, total_grace) VALUES
-- Giáo tỉnh Hà Nội (11 Giáo phận)
('HN', 'Tổng Giáo Phận Hà Nội', 'BẮC', 0),
('BN', 'Giáo Phận Bắc Ninh', 'BẮC', 0),
('BC', 'Giáo Phận Bùi Chu', 'BẮC', 0),
('HP', 'Giáo Phận Hải Phòng', 'BẮC', 0),
('HTI', 'Giáo Phận Hà Tĩnh', 'BẮC', 0),
('HH', 'Giáo Phận Hưng Hóa', 'BẮC', 0),
('LS', 'Giáo Phận Lạng Sơn - Cao Bằng', 'BẮC', 0),
('PD', 'Giáo Phận Phát Diệm', 'BẮC', 0),
('TB', 'Giáo Phận Thái Bình', 'BẮC', 0),
('TH', 'Giáo Phận Thanh Hóa', 'BẮC', 0),
('VI', 'Giáo Phận Vinh', 'BẮC', 0),
-- Giáo tỉnh Huế (6 Giáo phận)
('HUE', 'Tổng Giáo Phận Huế', 'TRUNG', 0),
('BMT', 'Giáo Phận Ban Mê Thuột', 'TRUNG', 0),
('DN', 'Giáo Phận Đà Nẵng', 'TRUNG', 0),
('KT', 'Giáo Phận Kon Tum', 'TRUNG', 0),
('NT', 'Giáo Phận Nha Trang', 'TRUNG', 0),
('QN', 'Giáo Phận Quy Nhơn', 'TRUNG', 0),
-- Giáo tỉnh Sài Gòn (10 Giáo phận)
('SG', 'Tổng Giáo Phận TP. Hồ Chí Minh', 'NAM', 0),
('BR', 'Giáo Phận Bà Rịa', 'NAM', 0),
('CT', 'Giáo Phận Cần Thơ', 'NAM', 0),
('DL', 'Giáo Phận Đà Lạt', 'NAM', 0),
('LX', 'Giáo Phận Long Xuyên', 'NAM', 0),
('MT', 'Giáo Phận Mỹ Tho', 'NAM', 0),
('PT', 'Giáo Phận Phan Thiết', 'NAM', 0),
('PC', 'Giáo Phận Phú Cường', 'NAM', 0),
('VL', 'Giáo Phận Vĩnh Long', 'NAM', 0),
('XL', 'Giáo Phận Xuân Lộc', 'NAM', 0);

-- ====================================================================
-- SEED DATA: 12 CATHOLIC DAILY SCRIPTURES (LỘC THÁNH LỜI CHÚA)
-- ====================================================================
INSERT IGNORE INTO daily_scriptures (id, theme_title, bible_verse, reference_book, reflection) VALUES
(1, 'Bình An Trong Tay Chúa',
'Thầy để lại bình an cho anh em, Thầy ban cho anh em bình an của Thầy. Thầy ban cho anh em không theo kiểu thế gian. Lòng anh em đừng xao xuyến cũng đừng sợ hãi.',
'Gioan 14:27',
'Hôm nay, hãy trao phó mọi nỗi lo âu, gánh nặng của công việc và gia đình cho Chúa. Ngài đang ở cùng bạn trong từng nhịp thở.'),

(2, 'Ánh Sáng Soi Đường',
'Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường cho con đi.',
'Thánh Vịnh 119:105',
'Khi đứng trước những quyết định khó khăn, hãy dành một phút thinh lặng cầu nguyện. Chúa Thánh Thần sẽ soi sáng giúp bạn chọn con đường ngay chính.'),

(3, 'Tình Yêu Kiên Nhẫn & Nhân Hậu',
'Đức mến thì nhẫn nhục, hiền hậu, không ghen tương, không vênh vang, không tự đắc, không làm điều bất chính, không tìm tư lợi.',
'1 Côrintô 13:4-5',
'Hãy bắt đầu ngày mới bằng một nụ cười hiền hòa và lời nói yêu thương với những người thân yêu quanh mình.'),

(4, 'Trông Cậy Vào Hồng Ân',
'Đức Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì. Trong đồng cỏ xanh tươi, Người cho tôi nằm nghỉ.',
'Thánh Vịnh 23:1-2',
'Thiên Chúa luôn quan phòng và chăm sóc cuộc đời bạn. Đừng nản lòng trước thử thách tạm thời, vì ân sủng của Ngài luôn đủ cho bạn.'),

(5, 'Sức Mạnh Của Lời Cầu Nguyện',
'Anh em cứ xin thì sẽ được, cứ tìm thì sẽ thấy, cứ gõ cửa thì sẽ mở cho.',
'Mátthêu 7:7',
'Không có lời cầu nguyện chân thành nào bị lãng quên trước nhan Chúa. Hãy kiên trì cầu xin với lòng tín thác trọn vẹn.'),

(6, 'Đôi Cánh Phượng Hoàng',
'Những ai cậy trông Đức Chúa thì được thêm sức mạnh. Họ sẽ tung cánh bay cao như phượng hoàng, chạy mà không mỏi mệt, đi mà không kiệt sức.',
'Isaia 40:31',
'Dù thân xác hay tinh thần có lúc mỏi mệt, niềm cậy trông vào Chúa sẽ tiếp thêm nguồn sinh lực mới để bạn vượt qua mọi dốc cao.'),

(7, 'Lòng Thương Xót Vô Biên',
'Tình thương Đức Chúa đời đời không dứt, lòng thương xót của Người mãi mãi chẳng vơi; mỗi buổi mai lại thêm mới mẻ.',
'Ai Ca 3:22-23',
'Mỗi bình minh thức dậy là một hồng ân mới mẻ. Hãy mở lòng đón nhận sự tha thứ và bình an của Chúa để làm mới cuộc đời mình.'),

(8, 'Tất Cả Nhờ Đấng Ban Sức Mạnh',
'Tôi có thể làm được mọi sự trong Đấng ban sức mạnh cho tôi.',
'Philípphê 4:13',
'Khi bạn kết hợp mật thiết với Đức Kitô, không có thử thách nào là quá sức. Hãy vững vàng tiến bước với niềm tin sắt đá.'),

(9, 'Chương Trình Bình An & Hy Vọng',
'Vì chính Ta biết các kế hoạch Ta định làm cho các ngươi: kế hoạch thịnh vượng chứ không phải tai ương, để ban cho các ngươi một tương lai và một niềm hy vọng.',
'Giêrêmia 29:11',
'Thiên Chúa luôn có một kế hoạch tốt đẹp cho cuộc đời bạn. Hãy kiên nhẫn và phó thác tương lai trong bàn tay yêu thương của Ngài.'),

(10, 'Hãy Đến Với Trái Tim Chúa',
'Tất cả những ai đang vất vả mang gánh nặng nề, hãy đến cùng tôi, tôi sẽ cho nghỉ ngơi bồi dưỡng.',
'Mátthêu 11:28',
'Hãy quỳ gối trước Thánh Thể và đặt mọi gánh nặng xuống chân bàn thờ. Trái Tim Chúa Giêsu luôn rộng mở đón nhận và nâng đỡ bạn.'),

(11, 'Phúc Cho Ai Kiến Tạo Hòa Bình',
'Phúc thay ai xây dựng hòa bình, vì họ sẽ được gọi là con Thiên Chúa.',
'Mátthêu 5:9',
'Hãy trở nên khí cụ bình an của Chúa: đem yêu thương vào nơi oán thù, đem thứ tha vào nơi lăng nhục, đem an hòa vào nơi tranh chấp.'),

(12, 'Mẹ Maria Luôn Đồng Hành',
'Linh hồn tôi ngợi khen Đức Chúa, thần trí tôi hớn hở vui mừng vì Thiên Chúa, Đấng cứu độ tôi.',
'Luca 1:46-47',
'Cùng với Đức Trinh Nữ Maria, hãy dâng lời tạ ơn Chúa vì muôn hồng ân diệu kỳ Ngài đã thực hiện trong gia đình và cuộc sống của bạn.');

-- ====================================================================
-- SEED DATA: CATHOLIC PRAYER CATALOG (KHO TÀNG KINH NGUYỆN & MÂN CÔI)
-- ====================================================================
INSERT IGNORE INTO prayer_catalog (id, title, category, duration_sec, grace_reward, verses_json) VALUES
('nam-dau-thanh-kinh-sang', 'Nghi Thức Đầu Thánh & Kinh Sáng', 'Kinh Nguyện Hằng Ngày', 150, 48,
'[{"text":"Nhân danh Cha và Con và Thánh Thần. Amen.","chime":true,"beadType":"CROSS"},{"text":"Lạy Chúa Thánh Thần, xin ngự đến, và từ trời cao xin chiếu tỏa ánh quang của Ngài.","chime":false,"beadType":"PATER"},{"text":"Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng, nước Cha trị đến, ý Cha thể hiện dưới đất cũng như trên trời.","chime":true,"beadType":"PATER"},{"text":"Xin Cha cho chúng con hôm nay lương thực hằng ngày, và tha nợ chúng con như chúng con cũng tha kẻ có nợ chúng con.","chime":false,"beadType":"PATER"},{"text":"Xin chớ để chúng con sa chước cám dỗ, nhưng cứu chúng con cho khỏi sự dữ. Amen.","chime":true,"beadType":"PATER"},{"text":"Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.","chime":false,"beadType":"AVE"},{"text":"Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.","chime":true,"beadType":"AVE"},{"text":"Sáng danh Đức Chúa Cha và Đức Chúa Con và Đức Chúa Thánh Thần. Như đã có trước vô cùng và bây giờ và hằng có và đời đời chẳng cùng. Amen.","chime":true,"beadType":"GLORIA"}]'),

('kinh-truyen-tin-angelus', 'Kinh Truyền Tin (Angelus - Sáng / Trưa / Chiều)', 'Kinh Truyền Tin', 140, 46,
'[{"text":"Đức Chúa Trời sai Thánh Thiên Thần truyền tin cho Rất Thánh Đức Bà Maria. Và Rất Thánh Đức Bà chịu thai bởi phép Đức Chúa Thánh Thần.","chime":true,"beadType":"ANGELUS"},{"text":"Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.","chime":false,"beadType":"AVE"},{"text":"Này tôi là tôi tá Đức Chúa Trời. Tôi xin vâng như lời Thánh Thiên Thần truyền.","chime":true,"beadType":"ANGELUS"},{"text":"Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.","chime":false,"beadType":"AVE"},{"text":"Chốc ấy Ngôi Thứ Hai xuống thế làm người. Và ở cùng chúng con.","chime":true,"beadType":"ANGELUS"},{"text":"Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.","chime":false,"beadType":"AVE"},{"text":"Lạy Rất Thánh Đức Mẹ Chúa Trời, xin cầu cho chúng con. Đáng chịu lấy những sự Chúa Kitô đã hứa.","chime":true,"beadType":"GLORIA"},{"text":"Chúng con lạy ơn Đức Chúa Trời, xin ban ơn xuống trong linh hồn chúng con, để nhờ sự thương khó và Thánh Giá Chúa Kitô, chúng con được sống lại hiển vinh. Amen.","chime":true,"beadType":"CROSS"}]'),

('kinh-man-coi-nam-su-vui', 'Chuỗi Mân Côi - Năm Sự Vui (Kính Đức Mẹ)', 'Chuỗi Mân Côi', 210, 79,
'[{"text":"Thứ nhất thì ngắm: Thiên Thần truyền tin cho Đức Bà chịu thai. Ta hãy xin cho được ở khiêm nhường.","chime":true,"beadType":"MYSTERY"},{"text":"Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng... Xin cứu chúng con cho khỏi sự dữ. Amen.","chime":false,"beadType":"PATER"},{"text":"Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ và Giêsu con lòng Bà gồm phúc lạ. Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.","chime":true,"beadType":"AVE"},{"text":"Thứ hai thì ngắm: Đức Bà đi viếng Bà Thánh Isave. Ta hãy xin cho được lòng yêu người.","chime":true,"beadType":"MYSTERY"},{"text":"Thứ ba thì ngắm: Đức Bà sinh Đức Chúa Giêsu nơi hang đá. Ta hãy xin cho được lòng khó khăn.","chime":true,"beadType":"MYSTERY"},{"text":"Thứ tư thì ngắm: Đức Bà dâng Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được vâng lời chịu lụy.","chime":true,"beadType":"MYSTERY"},{"text":"Thứ năm thì ngắm: Đức Bà tìm được Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được giữ nghĩa cùng Chúa luôn.","chime":true,"beadType":"MYSTERY"},{"text":"Sáng danh Đức Chúa Cha và Đức Chúa Con và Đức Chúa Thánh Thần. Như đã có trước vô cùng và bây giờ và hằng có và đời đời chẳng cùng. Amen.","chime":true,"beadType":"GLORIA"},{"text":"Lạy Chúa Giêsu, xin tha tội cho chúng con, xin cứu chúng con khỏi sa hỏa ngục, xin đem các linh hồn lên Thiên Đàng, nhất là những linh hồn cần đến lòng Chúa thương xót hơn. Amen.","chime":true,"beadType":"FATIMA"}]'),

('chuoi-long-chua-thuong-xot', 'Chuỗi Kinh Lòng Chúa Thương Xót (Giờ 3 Giờ Chiều)', 'Lòng Chúa Thương Xót', 180, 61,
'[{"text":"Lạy Cha Hằng Hữu, con xin dâng lên Cha Mình và Máu, Linh Hồn và Thần Tính của Con Rất Yêu Dấu Cha là Đức Giêsu Kitô, Chúa chúng con, để đền vì tội lỗi chúng con và toàn thế giới.","chime":true,"beadType":"PATER"},{"text":"Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót chúng con và toàn thế giới.","chime":false,"beadType":"AVE"},{"text":"Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót gia đình chúng con và những người đang đau yếu.","chime":false,"beadType":"AVE"},{"text":"Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót các linh hồn nơi Luyện Ngục và ban bình an cho thế giới.","chime":true,"beadType":"AVE"},{"text":"Lạy Đấng Chí Thánh, là Thiên Chúa Toàn Năng Hằng Hữu, xin thương xót chúng con và toàn thế giới. (3 lần)","chime":true,"beadType":"GLORIA"},{"text":"Lạy Chúa Giêsu, con tín thác vào Chúa! Lạy Máu và Nước tuôn trào từ Trái Tim Chúa Giêsu như thác nguồn thương xót chúng con, con tín thác vào Chúa!","chime":true,"beadType":"CROSS"}]'),

('kinh-hoa-binh-thanh-phanxico', 'Kinh Hòa Bình (Thánh Phanxicô Assisi) & Kinh Tối', 'Kinh Hòa Bình & Tạ Ơn', 150, 48,
'[{"text":"Lạy Chúa từ nhân, xin cho con biết mến yêu và phụng sự Chúa trong mọi người.","chime":true,"beadType":"CROSS"},{"text":"Lạy Chúa, xin hãy dùng con như khí cụ bình an của Chúa: Đem yêu thương vào nơi oán thù, đem thứ tha vào nơi lăng nhục.","chime":false,"beadType":"AVE"},{"text":"Đem an hòa vào nơi tranh chấp, đem chân lý vào chốn lỗi lầm.","chime":false,"beadType":"AVE"},{"text":"Đem tin kính vào nơi nghi nan, chiếu trông cậy vào nơi thất vọng.","chime":true,"beadType":"AVE"},{"text":"Để con dọi ánh sáng vào nơi tối tăm, đem niềm vui đến chốn u sầu.","chime":false,"beadType":"AVE"},{"text":"Lạy Chúa, xin hãy dạy con: Tìm an ủi người hơn được người ủi an, tìm hiểu biết người hơn được người hiểu biết, tìm yêu mến người hơn được người mến yêu.","chime":true,"beadType":"PATER"},{"text":"Vì chính khi hiến thân là khi được nhận lãnh, chính lúc quên mình là lúc gặp lại bản thân.","chime":false,"beadType":"AVE"},{"text":"Bởi chính khi thứ tha là khi được tha thứ, chính lúc chết đi là khi vui sống muôn đời. Amen.","chime":true,"beadType":"GLORIA"}]'),

('kinh-toi-gia-dinh', 'Kinh Tối Gia Đình & Kinh Phó Dâng', 'Kinh Tối Gia Đình', 130, 45,
'[{"text":"Chúng con cậy vì danh Chúa nhân từ, xin cho gia đình chúng con đêm nay được bình an trong tay Chúa quan phòng.","chime":true,"beadType":"CROSS"},{"text":"Lạy Chúa, con xin phó dâng linh hồn và xác con ở tay Chúa. Chúa đã phù hộ con ban ngày, thì xin Chúa cũng gìn giữ con ban đêm.","chime":false,"beadType":"PATER"},{"text":"Xin tha mọi tội lỗi chúng con trót phạm trong ngày hôm nay, và ban Thánh Thần tình yêu ngự trị trong mái ấm gia đình chúng con.","chime":true,"beadType":"AVE"},{"text":"Lạy Nữ Vương Gia Đình, xin cầu cho chúng con được sống hòa thuận, hiếu thảo và trung tín bước theo chân Chúa. Amen.","chime":true,"beadType":"GLORIA"}]');

SET FOREIGN_KEY_CHECKS = 1;
