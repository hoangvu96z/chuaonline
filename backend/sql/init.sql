-- ====================================================================
-- CHÙA ONLINE 3D - DATABASE INITIALIZATION SCHEMA
-- High-CCU Virtual Buddhist Temple System
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------
-- 1. TABLE: users
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recovery_code VARCHAR(64) UNIQUE NOT NULL,
  dharma_name VARCHAR(50) NOT NULL,
  robe_color VARCHAR(16) DEFAULT '#5c6b73',
  province_code VARCHAR(10) DEFAULT 'SG',
  merit_points BIGINT DEFAULT 0,
  sutras_completed INT DEFAULT 0,
  leaves_swept INT DEFAULT 0,
  realm_level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leaderboard (merit_points DESC),
  INDEX idx_province (province_code, merit_points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. TABLE: wishes_wall
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishes_wall (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  dharma_name VARCHAR(50) NOT NULL,
  wish_type ENUM('INCENSE', 'LANTERN') NOT NULL,
  content VARCHAR(200) NOT NULL,
  pos_x FLOAT DEFAULT 0,
  pos_z FLOAT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active_wishes (wish_type, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. TABLE: province_merits
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS province_merits (
  province_code VARCHAR(10) PRIMARY KEY,
  province_name VARCHAR(50) NOT NULL,
  total_merit BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. TABLE: daily_fortunes
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_fortunes (
  id INT PRIMARY KEY,
  rank_title VARCHAR(50) NOT NULL,
  poem TEXT NOT NULL,
  interpretation TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. TABLE: sutras
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sutras (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  duration_sec INT NOT NULL,
  merit_reward INT NOT NULL,
  verses_json JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED DATA: 63 PROVINCES OF VIETNAM
-- ====================================================================
INSERT IGNORE INTO province_merits (province_code, province_name, total_merit) VALUES
('SG', 'TP. Hồ Chí Minh', 0),
('HN', 'Hà Nội', 0),
('DN', 'Đà Nẵng', 0),
('HP', 'Hải Phòng', 0),
('CT', 'Cần Thơ', 0),
('TTH', 'Thừa Thiên Huế', 0),
('KH', 'Khánh Hòa', 0),
('LD', 'Lâm Đồng', 0),
('QN', 'Quảng Ninh', 0),
('BD', 'Bình Dương', 0),
('DNA', 'Đồng Nai', 0),
('BRVT', 'Bà Rịa - Vũng Tàu', 0),
('AG', 'An Giang', 0),
('KG', 'Kiên Giang', 0),
('DT', 'Đồng Tháp', 0),
('VL', 'Vĩnh Long', 0),
('TV', 'Trà Vinh', 0),
('ST', 'Sóc Trăng', 0),
('BL', 'Bạc Liêu', 0),
('CM', 'Cà Mau', 0),
('HG', 'Hậu Giang', 0),
('TG', 'Tiền Giang', 0),
('BT', 'Bến Tre', 0),
('LA', 'Long An', 0),
('TN', 'Tây Ninh', 0),
('BP', 'Bình Phước', 0),
('BTH', 'Bình Thuận', 0),
('NT', 'Ninh Thuận', 0),
('PY', 'Phú Yên', 0),
('BDI', 'Bình Định', 0),
('QNG', 'Quảng Ngãi', 0),
('QNA', 'Quảng Nam', 0),
('QT', 'Quảng Trị', 0),
('QB', 'Quảng Bình', 0),
('HT', 'Hà Tĩnh', 0),
('NA', 'Nghệ An', 0),
('TH', 'Thanh Hóa', 0),
('NB', 'Ninh Bình', 0),
('ND', 'Nam Định', 0),
('TB', 'Thái Bình', 0),
('HNA', 'Hà Nam', 0),
('HY', 'Hưng Yên', 0),
('HD', 'Hải Dương', 0),
('BN', 'Bắc Ninh', 0),
('VP', 'Vĩnh Phúc', 0),
('PT', 'Phú Thọ', 0),
('BG', 'Bắc Giang', 0),
('TNU', 'Thái Nguyên', 0),
('LS', 'Lạng Sơn', 0),
('CB', 'Cao Bằng', 0),
('BK', 'Bắc Kạn', 0),
('TQ', 'Tuyên Quang', 0),
('HGIA', 'Hà Giang', 0),
('LC', 'Lào Cai', 0),
('YB', 'Yên Bái', 0),
('SL', 'Sơn La', 0),
('DB', 'Điện Biên', 0),
('LCH', 'Lai Châu', 0),
('HB', 'Hòa Bình', 0),
('KT', 'Kon Tum', 0),
('GL', 'Gia Lai', 0),
('DL', 'Đắk Lắk', 0),
('DNO', 'Đắk Nông', 0);

-- ====================================================================
-- SEED DATA: 12 BUDDHIST DAILY FORTUNES
-- ====================================================================
INSERT IGNORE INTO daily_fortunes (id, rank_title, poem, interpretation) VALUES
(1, 'Thượng Thượng Cát - Hoa Khai Kiến Phật', 
'Hoa sen hé nở cõi thanh lương,\nÁnh sáng từ bi tỏa vạn phương.\nTâm thiện gieo mầm tươi tốt mãi,\nPhúc duyên tròn vẹn tựa trăng gương.',
'Quẻ xăm đại cát tường. Trăm hoa đua nở, bồ đề tâm phát khởi. Mọi sự mong cầu từ công danh, sức khỏe đến đạo duyên đều được thuận buồm xuôi gió. Hãy giữ vững lòng thiện lương và tinh tấn tu tập, phước báu vô lượng sẽ luôn chở che.'),

(2, 'Thượng Cát - Xuân Mộc Phát Vinh',
'Cây xuân đâm lộc tiết mưa dầm,\nẤm áp bình an tỏa đáy tâm.\nNhẫn nại qua rồi đông lạnh giá,\nHoa thơm quả ngọt kết trăm năm.',
'Quẻ xuân tươi tốt. Như cây khô gặp mưa xuân, sinh cơ bừng nở sau thời gian dài kiên trì và tích lũy. Công việc, tài lộc khởi sắc. Nên khiêm cung, hòa nhã với mọi người và tích lũy thêm thiện nghiệp để tài lộc bền lâu.'),

(3, 'Trung Bình - Thủ Thường Tĩnh Đợi',
'Nước biếc non xanh cứ thản nhiên,\nLòng buông thế sự nhẹ trần duyên.\nThủ thường tĩnh đợi qua giông bão,\nTrăng sáng mây tan rạng cửa thiền.',
'Quẻ khuyên giữ tâm an tĩnh. Hiện tại chưa phải lúc bôn ba mưu tính chuyện lớn. Hãy an trú trong hiện tại, tu dưỡng thân tâm, giữ gìn bổn phận và tránh tranh chấp. Đợi khi thời vận hanh thông, mọi nút thắt tự nhiên sẽ cởi mở.'),

(4, 'Thượng Cát - Thính Phong Lạc Nguyệt',
'Gió thoảng đầu non nghe tiếng kinh,\nTrăng soi mặt nước sáng tâm mình.\nUng dung cất bước đường quang đãng,\nMuôn lối thênh thang trọn nghĩa tình.',
'Quẻ cát tường, tâm cảnh thong dong tự tại. Người nhận quẻ này có quý nhân tương trợ, đường đi thông thoáng. Hãy đem tình thương và sự chân thành đối đãi với tha nhân, ắt gặt hái phúc lành dài lâu.'),

(5, 'Trung Cát - Vân Khai Kiến Nhật',
'Mây mù che khuất ánh vầng dương,\nChớ vội bi quan giữa đoạn trường.\nChờ ngọn gió lành xua ám chướng,\nTrời quang mây tạnh tỏ muôn phương.',
'Mây tan thấy mặt trời. Khó khăn gian nan trước mắt sắp sửa qua đi, thời kỳ tươi sáng đang dần hé mở. Cần kiên định đạo tâm, không nản chí, giữ tâm chánh niệm ắt gặp điều lành.'),

(6, 'Trung Bình - Định Tuệ Đẳng Trì',
'Lửa giận vừa nhen vội tắt ngay,\nTâm bình sóng lặng giữa đời này.\nĐịnh sâu tuệ sáng lòng thanh thản,\nBến giác an nhiên chẳng đổi thay.',
'Quẻ khuyên tu tập thiền định và trí tuệ song hành. Trong các mối quan hệ xã hội hoặc gia đạo, chớ để cơn nóng giận làm tổn hại phúc đức. Học cách lắng nghe và tha thứ, tâm sẽ tìm thấy bến đỗ an lạc.'),

(7, 'Thượng Cát - Bồ Đề Tự Tính',
'Bồ đề vốn sẵn ở trong tâm,\nTìm kiếm xa xôi uổng tháng năm.\nQuay lại soi gương nhìn rõ mặt,\nHương sen ngào ngạt cõi thiền lâm.',
'Quẻ nói về sự tỉnh thức nội tâm. Hạnh phúc và câu trả lời bấy lâu nay tìm kiếm thực chất nằm ngay trong chính lòng mình. Hãy buông bớt vọng niệm, trân quý những gì đang có, tương lai sẽ vô cùng xán lạn.'),

(8, 'Trung Cát - Nhất Niệm Tịnh Tâm',
'Một niệm tâm thanh sạch bụi trần,\nBao nhiêu oan trái hóa hồng ân.\nĐắp bồi công đức gieo duyên thiện,\nTổ ấm bình yên rạng phước phần.',
'Tâm tịnh thì cõi Phật tịnh. Khi gặp chuyện thị phi trắc trở, chỉ cần một niệm nhẫn nhịn và hồi hướng thiện căn là giải trừ nghiệp chướng. Gia đạo và tình duyên sẽ chuyển từ hung sang cát.'),

(9, 'Thượng Thượng Cát - Vạn Pháp Quy Nhất',
'Vạn sự hanh thông hợp đất trời,\nĐạo mầu soi chiếu khắp muôn nơi.\nTay cầm đuốc tuệ soi đường lạc,\nPhúc lộc tràn trề tiếng reo vui.',
'Quẻ cực kỳ may mắn và viên mãn. Ý chí và hành động hòa hợp với thiện đạo, nhân quả tròn đầy. Việc mong cầu học hành, sự nghiệp hay cầu an giải hạn đều được chư Phật từ bi gia hộ thành tựu mỹ mãn.'),

(10, 'Trung Bình - Tùy Duyên Tiêu Nghiệp',
'Nước chảy hoa trôi lẽ tự nhiên,\nBuông tay chấp niệm dứt ưu phiền.\nTùy duyên sống trọn từng giây phút,\nKhổ não tiêu tan nhẹ gánh thiền.',
'Quẻ nhắc nhở tinh thần tùy duyên bất biến. Đừng cưỡng cầu những điều vượt ngoài tầm với lúc này. Hãy bao dung với chính mình và hoàn cảnh, trả xong nợ cũ thì phước mới tự khắc sinh sôi.'),

(11, 'Thượng Cát - Phúc Đức Lưu Phương',
'Gốc đức vun trồng tự bấy lâu,\nHôm nay hoa nở rực ngàn màu.\nTiếng thơm để lại cho con cháu,\nDòng nước nguồn xa chảy mãi sâu.',
'Phúc đức sâu dày để lại tiếng thơm. Những việc thiện thầm kín bạn đã làm từ trước đến nay đang đơm hoa kết trái. Con cháu được nhờ ân huệ, việc làm ăn và sức khỏe cả nhà đều hưng thịnh.'),

(12, 'Trung Cát - Tâm Không Cảnh Tịnh',
'Tâm không dung chứa vạn trùng dương,\nCảnh tịnh bao la ngát khói hương.\nGác lại lo toan trần thế tục,\nVề nương bóng Phật giữa miên trường.',
'Tâm rộng mở thì cảnh giới an nhàn. Hãy dành thời gian tĩnh tâm, chiêm bái chùa chiền và nghe kinh giảng pháp. Tâm trí sáng suốt sẽ giúp bạn đưa ra những quyết định đúng đắn nhất trong giai đoạn chuyển biến mới.');

-- ====================================================================
-- SEED DATA: 12 BUDDHIST SUTRAS & LITURGIES
-- ====================================================================
INSERT IGNORE INTO sutras (id, title, category, duration_sec, merit_reward, verses_json) VALUES
('bat-nha-tam-kinh', 'Bát Nhã Ba La Mật Đa Tâm Kinh', 'Trí Tuệ Bát Nhã', 180, 69, 
'[{"text":"Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời,","bell":true},{"text":"Chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.","bell":false},{"text":"Xá Lợi Tử! Sắc bất dị không, không bất dị sắc,","bell":false},{"text":"Sắc tức thị không, không tức thị sắc,","bell":false},{"text":"Thọ, tưởng, hành, thức, diệc phục như thị.","bell":true},{"text":"Xá Lợi Tử! Thị chư pháp không tướng: bất sanh bất diệt,","bell":false},{"text":"Bất cấu bất tịnh, bất tăng bất giảm.","bell":false},{"text":"Thị cố không trung vô sắc, vô thọ, tưởng, hành, thức;","bell":false},{"text":"Vô nhãn, nhĩ, tỷ, thiệt, thân, ý; vô sắc, thanh, hương, vị, xúc, pháp;","bell":false},{"text":"Vô vô minh, diệc vô vô minh tận, nãi chí vô lão tử, diệc vô lão tử tận;","bell":false},{"text":"Vô khổ, tập, diệt, đạo; vô trí diệc vô đắc.","bell":true},{"text":"Yết đế, yết đế, ba la yết đế, ba la tăng yết đế, Bồ đề tát bà ha.","bell":true},{"text":"Ma Ha Bát Nhã Ba La Mật Đa. (3 lần)","bell":true}]'),

('chu-dai-bi-tam-yeu', 'Thiên Thủ Thiên Nhãn Đại Bi Tâm Đà La Ni', 'Mật Chú & Thần Lực', 150, 67,
'[{"text":"Nam mô Đại Bi Hội Thượng Phật Bồ Tát. (3 lần)","bell":true},{"text":"Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni.","bell":false},{"text":"Nam mô hắc ra đát na đa ra dạ da.","bell":false},{"text":"Nam mô a rị da, bà lô yết đế thước bát ra da,","bell":false},{"text":"Bồ đề tát đỏa bà da, ma ha tát đỏa bà da,","bell":false},{"text":"Ma ha ca lô ni ca da. Án, tát bàn ra phạt duệ,","bell":false},{"text":"Số đát na đát tỏa. Nam mô tất kiết lật đỏa y mông a rị da,","bell":false},{"text":"Bà lô kiết đế thất Phật ra lăng đà bà.","bell":true},{"text":"Án, tất điện đô, mạn đa ra, bạt đà dạ, ta bà ha. (3 lần)","bell":true}]'),

('kinh-tu-bi', 'Kinh Tâm Từ Bi (Metta Sutta)', 'Từ Bi & Trí Tuệ', 120, 43,
'[{"text":"Nguyện cho tất cả chúng sanh đều được an vui và không có khổ đau.","bell":true},{"text":"Nguyện cho muôn loài dù yếu hay mạnh, dù lớn hay nhỏ, dù thấy hay không thấy,","bell":false},{"text":"Dù ở gần hay ở xa, đã sanh hay sắp sanh, thảy đều được an lạc.","bell":true},{"text":"Đừng ai lừa dối ai, đừng ai khinh dễ ai ở bất cứ nơi nào.","bell":false},{"text":"Như mẹ hiền thương yêu và bảo vệ con một bằng cả mạng sống mình,","bell":false},{"text":"Hãy mở rộng lòng từ bi vô lượng đến với tất cả muôn loài chúng sanh.","bell":true}]'),

('niem-phat-tu-tu', 'Pháp Âm Niệm Phật & Quán Âm Thánh Hiệu', 'Tịnh Độ Niệm Phật', 100, 32,
'[{"text":"Nam Mô Bổn Sư Thích Ca Mâu Ni Phật.","bell":true},{"text":"Nam Mô Tây Phương Cực Lạc Thế Giới Đại Từ Đại Bi A Di Đà Phật.","bell":true},{"text":"Nam Mô Đại Bi Quán Thế Âm Bồ Tát.","bell":false},{"text":"Nam Mô Đại Thế Chí Bồ Tát.","bell":false},{"text":"Nam Mô Địa Tạng Vương Bồ Tát.","bell":false},{"text":"Nam Mô Thanh Tịnh Đại Hải Chúng Bồ Tát.","bell":true}]'),

('ke-hoi-huong', 'Kệ Phổ Hiền & Hồi Hướng Công Đức', 'Hồi Hướng Phổ Độ', 90, 35,
'[{"text":"Tụng kinh công đức thù thắng hạnh, vô biên thắng phước giai hồi hướng,","bell":true},{"text":"Phổ nguyện pháp giới chư chúng sanh, tốc vãng Vô Lượng Quang Phật sát.","bell":false},{"text":"Nguyện tiêu tam chướng trừ phiền não, nguyện đắc trí huệ chơn minh liễu,","bell":false},{"text":"Phổ nguyện tội chướng tất tiêu trừ, thế thế thường hành Bồ Tát đạo.","bell":true},{"text":"Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.","bell":true}]'),

('kinh-duoc-su', 'Kinh Dược Sư Lưu Ly Quang Như Lai (12 Đại Nguyện Cầu An)', 'Cầu An & Tiêu Tai', 210, 93,
'[{"text":"Nguyện thứ nhất: Khi thành Phật, thân ta sáng rực khắp vô lượng cõi, ba mươi hai tướng tốt trang nghiêm muôn loài.","bell":true},{"text":"Nguyện thứ hai: Thân như ngọc lưu ly trong ngoài sáng suốt, không chút tỳ vết, khai mở trí tuệ phá tan tăm tối.","bell":false},{"text":"Nguyện thứ ba: Dùng trí huệ vô biên khiến cho muôn loài thọ dụng vật dụng dồi dào, không hề thiếu thốn.","bell":false},{"text":"Nguyện thứ tư: Dẫn dắt người lầm đường lạc lối an trú vào đạo Bồ Đề, tu hành chánh đạo giải thoát viên mãn.","bell":true},{"text":"Nguyện thứ năm: Khiến người tu trì giới luật thanh tịnh, lỡ phạm tội lỗi nghe danh hiệu ta liền tiêu trừ nghiệp chướng.","bell":false},{"text":"Nguyện thứ sáu: Muôn người thân thể tật nguyền, đui điếc ngọng câm khi nghe danh ta liền được đoan chính khỏe mạnh.","bell":false},{"text":"Nguyện thứ bảy: Cứu vớt chúng sanh nghèo khổ bệnh tật không người nương tựa, thân tâm thảnh thơi quyến thuộc sum vầy.","bell":true},{"text":"Nguyện thứ tám: Người nữ chịu bao bức bách nghe danh hiệu ta liền chuyển hóa phiền não, đạt quả vị giác ngộ.","bell":false},{"text":"Nguyện thứ chín: Thoát khỏi lưới tà kiến ma vương, dứt trừ ác nghiệp, tu tập các hạnh Bồ Tát thanh tịnh.","bell":false},{"text":"Nguyện thứ mười: Người mắc tù đày quan tai lao ngục, nghe niệm Dược Sư Như Lai liền được thoát khỏi mọi sự kinh sợ.","bell":true},{"text":"Nguyện thứ mười một: Kẻ chịu đói khát bần hàn trước được no đủ mỹ vị, sau thọ dụng pháp vị vi diệu an vui.","bell":false},{"text":"Nam mô Bạc già phạt đế, bệ sát xã, lũ rô thích lưu ly, bát lặt bà, hắt ra xà dã, đát tha yết đa da, a ra hắt đế, tam miệu tam bột đà da. Đát điệt tha: Án, bệ sát thệ, bệ sát thệ, bệ sát xã, tam một yết đế toà ha.","bell":true}]'),

('kinh-a-di-da', 'Kinh Phật Thuyết A Di Đà (Tịnh Độ Cực Lạc)', 'Tịnh Độ Cực Lạc', 190, 85,
'[{"text":"Từ cõi Ta Bà này trải qua mười muôn ức cõi Phật, có thế giới tên là Cực Lạc, giáo chủ hiệu là A Di Đà Phật.","bell":true},{"text":"Cõi nước kia vì sao tên Cực Lạc? Chúng sanh trong cõi ấy không có mọi sự khổ, chỉ hưởng những điều vui trọn vẹn.","bell":false},{"text":"Lại cõi Cực Lạc có bảy tầng bao lơn, bảy tầng lưới giăng, bảy hàng cây báu, đều bằng bốn ngọc châu báu trang nghiêm vi diệu.","bell":false},{"text":"Lại có ao bằng bảy báu, chứa đầy nước tám công đức trong veo thơm mát, đáy ao thuần dùng cát vàng lót trải.","bell":true},{"text":"Bốn bên bờ ao đường đi xây bằng vàng bạc lưu ly pha lê; trên bờ có lầu gác nguy nga tráng lệ trang nghiêm.","bell":false},{"text":"Hoa sen trong ao to như bánh xe, sắc xanh ánh xanh, sắc vàng ánh vàng, sắc đỏ ánh đỏ, sắc trắng ánh trắng, vi diệu hương khiết.","bell":true},{"text":"Cõi Phật ấy ngày đêm sáu thời trời rải hoa mạn đà la, chúng sanh thường lấy vạt áo hứng hoa thơm cúng dường chư Phật.","bell":false},{"text":"Lại có vô số chim báu kỳ diệu ngày đêm hòa tiếng hót nhã ca, diễn xướng năm căn, năm lực, bảy bồ đề phần, tám thánh đạo phần.","bell":false},{"text":"Chúng sanh nghe tiếng chim hót, gió lay cây báu đều đồng tâm niệm Phật, niệm Pháp, niệm Tăng không gián đoạn.","bell":true},{"text":"Nam mô a di đa bà dạ, đá tha già đa dạ, đá địa dạ tha: A di rị đô bà tỳ, a di rị đa tất đam bà tỳ, a di rị đa tì ca lan đế, a di rị đa tì ca lan đa, già di nị, già già na, chỉ đa ca lệ, ta bà ha.","bell":true}]'),

('kinh-pho-mon', 'Kinh Phổ Môn (Quán Thế Âm Bồ Tát Cứu Khổ)', 'Cầu An & Cứu Khổ', 180, 65,
'[{"text":"Vô Tận Ý Bồ Tát chắp tay bạch Phật: Bạch Thế Tôn, do nhân duyên gì Bồ Tát tên là Quán Thế Âm?","bell":true},{"text":"Phật bảo: Nếu có vô lượng muôn ức chúng sanh chịu khổ não, nghe danh Quán Thế Âm một lòng xưng niệm, liền được giải thoát.","bell":false},{"text":"Nếu có người gìn giữ danh hiệu Quán Thế Âm Bồ Tát, dầu vào trong lửa lớn, lửa chẳng đốt được nhờ sức oai thần của Bồ Tát.","bell":false},{"text":"Nếu trôi dạt trong biển lớn, rồng cá quỷ dữ dập dồn, xưng danh Quán Thế Âm sóng gió liền lặng yên bến bờ an ổn.","bell":true},{"text":"Thế Tôn diệu tướng cụ, Ngã kim trùng vấn bỉ, Phật tử hà nhân duyên, Danh vi Quán Thế Âm?","bell":false},{"text":"Cụ túc thần thông lực, Quảng tu trí huệ phương, Thập phương chư quốc độ, Vô sát bất hiện thân.","bell":false},{"text":"Chúng sanh bị khốn ách, Vô lượng khổ bức thân, Quán Âm diệu trí lực, Năng cứu thế gian khổ.","bell":true},{"text":"Địa ngục quỷ súc sanh, Sanh lão bệnh tử khổ, Dĩ thứ tất linh diệt, Chân quán thanh tịnh quán.","bell":false},{"text":"Vô cấu thanh tịnh quang, Tuệ nhật phá chư ám, Năng phục tai phong hỏa, Phổ minh chiếu thế gian.","bell":false},{"text":"Nam Mô Đại Bi Quán Thế Âm Bồ Tát, tầm thinh cứu khổ cứu nạn linh cảm ứng nghiệm.","bell":true}]'),

('kinh-vu-lan', 'Kinh Vu Lan Báo Hiếu (Báo Ân Cha Mẹ)', 'Hiếu Đạo & Báo Ân', 180, 76,
'[{"text":"Tôn giả Mục Kiền Liên đắc lục thần thông, muốn báo đáp ân cha mẹ sanh thành dưỡng dục vi thâm.","bell":true},{"text":"Dùng mắt huệ thấy mẹ hiền nơi ngục ngạ quỷ, không ăn không uống, thân hình tiều tụy gầy mòn ôm nỗi đói khát.","bell":false},{"text":"Tôn giả xót thương dâng bát cơm đầy, mẹ nhận bát cơm cơm liền hóa thành than đỏ, chẳng nuốt được vào lòng.","bell":false},{"text":"Mục Liên trở về bạch Phật, Thế Tôn dạy: Nghiệp mẹ ông sâu dày, cần sức oai thần chú nguyện của chư Tăng mười phương ngày Tự Tứ.","bell":true},{"text":"Rằm tháng Bảy thiết lễ Vu Lan Bồn, cúng dường Tam Bảo chư Tăng thanh tịnh, mẹ ông cùng cửu huyền thất tổ liền thoát cảnh trầm luân.","bell":false},{"text":"Ân cha nghĩa mẹ nặng vô cùng, Mười tháng cưu mang chín chữ cù lao, nhọc nhằn sớm tối vì con.","bell":true},{"text":"Mẹ nằm chỗ ướt nhường ráo cho con, ngọt bùi phần trẻ, đắng cay phần mình, giọt sữa nuôi con lớn khôn nên vóc dáng.","bell":false},{"text":"Dầu cho vai cõng mẹ cha đi khắp bốn biển non cao, xương mòn thịt nát muôn kiếp cũng chưa báo đáp đủ ân sâu.","bell":false},{"text":"Nguyện đem thiện căn hiếu đạo hồi hướng mẹ cha hiện tiền trường thọ an khang, quá vãng nhiều đời đồng sanh Tịnh Độ.","bell":true}]'),

('sam-hoi-sau-can', 'Nghi Thức Sám Hối Sáu Căn & Hồng Danh Chư Phật', 'Sám Hối Tiêu Nghiệp', 180, 65,
'[{"text":"Đệ tử chúng con từ vô thỉ, Gây bao tội ác bởi lầm mê, Đắm trong sanh tử đã bao phen, Nay đến trước Phật thành tâm sám hối.","bell":true},{"text":"Mắt đắm sắc trần mê mải nhìn hoa thơm cỏ lạ, khởi niệm tham đắm oán ghét, đệ tử xin chí tâm sám hối căn mắt.","bell":false},{"text":"Tai nghe tiếng khen chê lời ong tiếng ve, sinh tâm hoan hỷ giận dữ dấy khởi muôn vàn sân hận, đệ tử xin sám hối căn tai.","bell":false},{"text":"Mũi ngửi các mùi hương vị đắm đuối xa hoa, tâm duyên trần cấu chẳng giữ chánh niệm, đệ tử xin sám hối căn mũi.","bell":true},{"text":"Miệng thốt lời dối trá, thêu dệt, đâm thọc, độc ác, tham đắm mỹ vị sát sanh hại mạng, đệ tử xin sám hối căn lưỡi.","bell":false},{"text":"Thân tạo nghiệp sát sanh, trộm cắp, tà dâm, theo thói buông lung làm khổ muôn loài, đệ tử xin sám hối căn thân.","bell":false},{"text":"Ý khởi bao toan tính, ghen tị tham lam, sân hận si mê, ngọn lửa vô minh thiêu rụi rừng công đức, đệ tử xin sám hối căn ý.","bell":true},{"text":"Xưa kia tạo bao ác nghiệp đều do vô thỉ tham sân si, từ thân miệng ý phát sinh ra, hết thảy con nay xin sám hối.","bell":false},{"text":"Tội từ tâm khởi đem tâm sám, Tâm được tịnh rồi tội liền tiêu; Tội tiêu tâm tịnh thảy đều không, Thế ấy mới là chân sám hối.","bell":true},{"text":"Nam mô Cầu Sám Hối Bồ Tát Ma Ha Tát. Nguyện nương hồng danh chư Phật mười phương gia hộ nghiệp chướng tiêu trừ, bồ đề tâm kiên cố.","bell":true}]'),

('thap-chu', 'Thập Chú (Mười Chú Nhỏ Nhập Tâm Tịnh Độ)', 'Mật Chú & Thần Lực', 180, 90,
'[{"text":"1. Như Ý Bảo Luân Vương Đà La Ni: Nam mô Phật đà da, Nam mô Đạt ma da, Nam mô Tăng già da. Nam mô Quán Tự Tại Bồ Tát ma ha tát... Án, bát đạp ma, chấn đa mạt ni, mạo lạt hồng.","bell":true},{"text":"2. Tiêu Tai Cát Tường Thần Chú: Nẵng mồ tam mãn đa, mẫu đà nẫm, a bát ra để, hạ đa xá, ta nẵng nẫm. Đát điệt tha: Án, khê khê, khê hế, khê hế, hồng hồng, nhập phạ ra, nhập phạ ra, ta bà ha.","bell":false},{"text":"3. Công Đức Bảo Sơn Thần Chú: Nam mô Phật đà da, Nam mô Đạt ma da, Nam mô Tăng già da. Tất đế hộ rô rô, tất đô rô, chỉ rị bà, kiết rị bà, tất đạt rị, bố rô rị, ta bà ha.","bell":true},{"text":"4. Phật Mẫu Chuẩn Đề Thần Chú: Khể thủ quy y Tô Tất Đế, đầu diện đảnh lễ Thất Câu Chi. Nam mô tát đa nẫm, tam miệu tam bồ đề, câu chi nẫm. Đát điệt tha: Án, chiết lệ chủ lệ, Chuẩn Đề, ta bà ha.","bell":false},{"text":"5. Thánh Vô Lượng Thọ Quyết Định Quang Minh Vương Đà La Ni: Án, nại ma ba cát ngoã đế, a ba ra mật đạp, a ưu rị a nạp, tô tất ninh, thật chấp đạp, điệp tả ra giá dã, đát tháp cả đạt dã, a ra ha đế, tam dược tam phật đà dã.","bell":true},{"text":"6. Dược Sư Quán Đảnh Chân Ngôn: Nam mô Bạc già phạt đế, bệ sát xã, lũ rô thích lưu ly, bát lặt bà, hắt ra xà dã, đát tha yết đa da. Đát điệt tha: Án, bệ sát thệ, bệ sát thệ, bệ sát xã, tam một yết đế toà ha.","bell":false},{"text":"7. Quán Âm Linh Cảm Chân Ngôn: Án, ma ni bát di hồng, ma hạt nghê nha nạp, tích đế bạt đạt, tích nạp vi đạt, lạt cát thiết năng, tư cát đát, bốc nhị lí, đát cát tháp, bốc nhị nạp, nặc ma rô kiết, thuyết ra da, ta bà ha.","bell":true},{"text":"8. Thất Phật Diệt Tội Chân Ngôn: Ly bà ly bà đế, cầu ha cầu ha đế, đà ra ni đế, ni ha ra đế, tỳ lê nễ đế, ma ha già đế, chân lăng càn đế, ta bà ha.","bell":false},{"text":"9. Vãng Sanh Tịnh Độ Thần Chú: Nam mô a di đa bà dạ, đá tha già đa dạ, đá địa dạ tha: A di rị đô bà tỳ, a di rị đa tất đam bà tỳ, a di rị đa tì ca lan đế, a di rị đa tì ca lan đa, già di nị, già già na, chỉ đa ca lệ, ta bà ha.","bell":false},{"text":"10. Thiện Thiên Nữ Chú: Nam mô Phật đà, Nam mô Đạt ma, Nam mô Tăng già. Nam mô Thất lợi, Ma ha đề tỵ da, đát nễ dã tha, ba lị phú lầu na, giá lị tam mạn đà, đạt xá ni, ma ha tỳ ha la già đế, ta bà ha.","bell":true}]'),

('kinh-phap-cu', 'Kinh Pháp Cú Thiện Ngôn (Dhammapada Tinh Hoa)', 'Từ Bi & Trí Tuệ', 160, 60,
'[{"text":"Tâm dẫn đầu các pháp, Tâm làm chủ, tâm tạo. Nếu với tâm ô nhiễm, Nói năng hay hành động, Khổ não bước theo sau, Như xe theo dấu vật kéo.","bell":true},{"text":"Tâm dẫn đầu các pháp, Tâm làm chủ, tâm tạo. Nếu với tâm thanh tịnh, Nói năng hay hành động, An lạc bước theo sau, Như bóng không rời hình.","bell":false},{"text":"Hận thù diệt hận thù, Đời này không thể có; Từ bi diệt hận thù, Là định luật ngàn thu.","bell":true},{"text":"Chiến thắng vạn quân thù, Không bằng tự thắng mình; Thắng mình là chiến công, Oanh liệt và tối thượng.","bell":false},{"text":"Dầu sống đến trăm năm, Không thấy pháp sanh diệt; Chẳng bằng sống một ngày, Thấy rõ pháp sanh diệt.","bell":false},{"text":"Lấy không giận thắng giận, Lấy thiện thắng không thiện, Lấy thí thắng xan tham, Lấy chân thật thắng giả dối.","bell":true},{"text":"Chớ khinh điều ác nhỏ, Cho rằng chẳng họa lây; Từng giọt nước nhỏ nhoi, Lâu ngày đầy lu lớn.","bell":false},{"text":"Chớ khinh điều thiện nhỏ, Cho rằng không phúc báo; Từng giọt nước tràn đầy, Thiện lành tích thành đại hải.","bell":false},{"text":"Không làm mọi điều ác, Thành tựu các hạnh lành, Tâm ý giữ trong sạch, Chính lời chư Phật dạy.","bell":true},{"text":"Tinh cần đường bất tử, Phóng dật cửa tử vong. Người tinh cần không chết, Kẻ phóng dật như đã chết rồi.","bell":true}]');

SET FOREIGN_KEY_CHECKS = 1;
