// backend/src/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function hashPassword(raw) {
  if (!raw) return null;
  return crypto.createHash('sha256').update(`chuaonline_salt_${String(raw).trim()}`).digest('hex');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_PROVINCES = [
  ['SG', 'TP. Hồ Chí Minh'], ['HN', 'Hà Nội'], ['DN', 'Đà Nẵng'], ['HP', 'Hải Phòng'],
  ['CT', 'Cần Thơ'], ['TTH', 'Thừa Thiên Huế'], ['KH', 'Khánh Hòa'], ['LD', 'Lâm Đồng'],
  ['QN', 'Quảng Ninh'], ['BD', 'Bình Dương'], ['DNA', 'Đồng Nai'], ['BRVT', 'Bà Rịa - Vũng Tàu'],
  ['AG', 'An Giang'], ['KG', 'Kiên Giang'], ['DT', 'Đồng Tháp'], ['VL', 'Vĩnh Long'],
  ['TV', 'Trà Vinh'], ['ST', 'Sóc Trăng'], ['BL', 'Bạc Liêu'], ['CM', 'Cà Mau'],
  ['HG', 'Hậu Giang'], ['TG', 'Tiền Giang'], ['BT', 'Bến Tre'], ['LA', 'Long An'],
  ['TN', 'Tây Ninh'], ['BP', 'Bình Phước'], ['BTH', 'Bình Thuận'], ['NT', 'Ninh Thuận'],
  ['PY', 'Phú Yên'], ['BDI', 'Bình Định'], ['QNG', 'Quảng Ngãi'], ['QNA', 'Quảng Nam'],
  ['QT', 'Quảng Trị'], ['QB', 'Quảng Bình'], ['HT', 'Hà Tĩnh'], ['NA', 'Nghệ An'],
  ['TH', 'Thanh Hóa'], ['NB', 'Ninh Bình'], ['ND', 'Nam Định'], ['TB', 'Thái Bình'],
  ['HNA', 'Hà Nam'], ['HY', 'Hưng Yên'], ['HD', 'Hải Dương'], ['BN', 'Bắc Ninh'],
  ['VP', 'Vĩnh Phúc'], ['PT', 'Phú Thọ'], ['BG', 'Bắc Giang'], ['TNU', 'Thái Nguyên'],
  ['LS', 'Lạng Sơn'], ['CB', 'Cao Bằng'], ['BK', 'Bắc Kạn'], ['TQ', 'Tuyên Quang'],
  ['HGIA', 'Hà Giang'], ['LC', 'Lào Cai'], ['YB', 'Yên Bái'], ['SL', 'Sơn La'],
  ['DB', 'Điện Biên'], ['LCH', 'Lai Châu'], ['HB', 'Hòa Bình'], ['KT', 'Kon Tum'],
  ['GL', 'Gia Lai'], ['DL', 'Đắk Lắk'], ['DNO', 'Đắk Nông']
];

const DEFAULT_FORTUNES = [
  {
    id: 1,
    rank_title: 'Thượng Thượng Cát - Hoa Khai Kiến Phật',
    poem: 'Trăng sáng soi tỏ mặt hồ thu\nMây tạnh trời quang vạn dặm mù\nTâm thành một nén hương dâng Phật\nPhước lộc trùng lai chẳng lo âu.',
    interpretation: 'Mọi sự mong cầu đều thuận theo chánh pháp. Giữ tâm thanh tịnh thì công việc, gia đạo tự khắc hanh thông.'
  },
  {
    id: 2,
    rank_title: 'Thượng Cát - Xuân Mộc Phát Vinh',
    poem: 'Cây khô gặp được trận mưa rào\nChồi biếc vươn lên đón nắng cao\nLàm lành tích đức từ hôm sớm\nQuả ngọt ngày sau ắt dồi dào.',
    interpretation: 'Thời vận đang chuyển mình tích cực. Hãy kiên trì làm việc thiện, giúp đỡ người xung quanh để tăng trưởng phước báu.'
  },
  {
    id: 3,
    rank_title: 'Trung Bình - Thủ Thường Tĩnh Đợi',
    poem: 'Gió thoảng mây trôi chớ vội vàng\nAn nhiên tự tại bước thênh thang\nChuyện đời được mất như sương sớm\nGiữ trọn chữ Tâm thắng vạn vàng.',
    interpretation: 'Giai đoạn này không nên nóng vội cưỡng cầu. Hãy tập trung tu sửa bản thân, tĩnh lặng quan sát trước khi đưa ra quyết định lớn.'
  },
  {
    id: 4,
    rank_title: 'Thượng Cát - Liên Hoa Xuất Thủy',
    poem: 'Sen hồng nở rộ giữa đầm sâu\nChẳng nhiễm bùn nhơ giữ sắc màu\nHương thơm lan tỏa mười phương cõi\nChánh niệm vững vàng vượt bể dâu.',
    interpretation: 'Nhờ giữ được phẩm hạnh trong sáng và nghị lực kiên cường, khó khăn trước mắt sẽ hóa thành cơ hội quý báu.'
  },
  {
    id: 5,
    rank_title: 'Đại Cát - Từ Vân Phổ Ấm',
    poem: 'Mây lành che mát khắp nhân gian\nCam lộ rưới tan mọi nhọc nhằn\nGia đạo sum vầy thêm hiếu thuận\nQuý nhân tương trợ bước bình an.',
    interpretation: 'Có duyên lành và quý nhân giúp đỡ. Hãy mở rộng lòng từ bi và chia sẻ niềm vui với mọi người.'
  }
];

const DEFAULT_SUTRAS = [
  {
    id: 'bat-nha-tam-kinh',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    category: 'Trí Tuệ Bát Nhã',
    duration_sec: 180,
    merit_reward: 69,
    verses_json: JSON.stringify([
      { text: 'Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời,', bell: true },
      { text: 'Chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.', bell: false },
      { text: 'Xá Lợi Tử! Sắc bất dị không, không bất dị sắc,', bell: false },
      { text: 'Sắc tức thị không, không tức thị sắc,', bell: false },
      { text: 'Thọ, tưởng, hành, thức, diệc phục như thị.', bell: true },
      { text: 'Xá Lợi Tử! Thị chư pháp không tướng: bất sanh bất diệt,', bell: false },
      { text: 'Bất cấu bất tịnh, bất tăng bất giảm.', bell: false },
      { text: 'Thị cố không trung vô sắc, vô thọ, tưởng, hành, thức;', bell: false },
      { text: 'Vô nhãn, nhĩ, tỷ, thiệt, thân, ý; vô sắc, thanh, hương, vị, xúc, pháp;', bell: false },
      { text: 'Vô vô minh, diệc vô vô minh tận, nãi chí vô lão tử, diệc vô lão tử tận;', bell: false },
      { text: 'Vô khổ, tập, diệt, đạo; vô trí diệc vô đắc.', bell: true },
      { text: 'Yết đế, yết đế, ba la yết đế, ba la tăng yết đế, Bồ đề tát bà ha.', bell: true },
      { text: 'Ma Ha Bát Nhã Ba La Mật Đa. (3 lần)', bell: true }
    ])
  },
  {
    id: 'chu-dai-bi-tam-yeu',
    title: 'Thiên Thủ Thiên Nhãn Đại Bi Tâm Đà La Ni',
    category: 'Mật Chú & Thần Lực',
    duration_sec: 150,
    merit_reward: 67,
    verses_json: JSON.stringify([
      { text: 'Nam mô Đại Bi Hội Thượng Phật Bồ Tát. (3 lần)', bell: true },
      { text: 'Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni.', bell: false },
      { text: 'Nam mô hắc ra đát na đa ra dạ da.', bell: false },
      { text: 'Nam mô a rị da, bà lô yết đế thước bát ra da,', bell: false },
      { text: 'Bồ đề tát đỏa bà da, ma ha tát đỏa bà da,', bell: false },
      { text: 'Ma ha ca lô ni ca da. Án, tát bàn ra phạt duệ,', bell: false },
      { text: 'Số đát na đát tỏa. Nam mô tất kiết lật đỏa y mông a rị da,', bell: false },
      { text: 'Bà lô kiết đế thất Phật ra lăng đà bà.', bell: true },
      { text: 'Án, tất điện đô, mạn đa ra, bạt đà dạ, ta bà ha. (3 lần)', bell: true }
    ])
  },
  {
    id: 'kinh-tu-bi',
    title: 'Kinh Tâm Từ Bi (Metta Sutta)',
    category: 'Từ Bi & Trí Tuệ',
    duration_sec: 120,
    merit_reward: 43,
    verses_json: JSON.stringify([
      { text: 'Nguyện cho tất cả chúng sanh đều được an vui và không có khổ đau.', bell: true },
      { text: 'Nguyện cho muôn loài dù yếu hay mạnh, dù lớn hay nhỏ, dù thấy hay không thấy,', bell: false },
      { text: 'Dù ở gần hay ở xa, đã sanh hay sắp sanh, thảy đều được an lạc.', bell: true },
      { text: 'Đừng ai lừa dối ai, đừng ai khinh dễ ai ở bất cứ nơi nào.', bell: false },
      { text: 'Như mẹ hiền thương yêu và bảo vệ con một bằng cả mạng sống mình,', bell: false },
      { text: 'Hãy mở rộng lòng từ bi vô lượng đến với tất cả muôn loài chúng sanh.', bell: true }
    ])
  },
  {
    id: 'niem-phat-tu-tu',
    title: 'Pháp Âm Niệm Phật & Quán Âm Thánh Hiệu',
    category: 'Tịnh Độ Niệm Phật',
    duration_sec: 100,
    merit_reward: 32,
    verses_json: JSON.stringify([
      { text: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật.', bell: true },
      { text: 'Nam Mô Tây Phương Cực Lạc Thế Giới Đại Từ Đại Bi A Di Đà Phật.', bell: true },
      { text: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát.', bell: false },
      { text: 'Nam Mô Đại Thế Chí Bồ Tát.', bell: false },
      { text: 'Nam Mô Địa Tạng Vương Bồ Tát.', bell: false },
      { text: 'Nam Mô Thanh Tịnh Đại Hải Chúng Bồ Tát.', bell: true }
    ])
  },
  {
    id: 'ke-hoi-huong',
    title: 'Kệ Phổ Hiền & Hồi Hướng Công Đức',
    category: 'Hồi Hướng Phổ Độ',
    duration_sec: 90,
    merit_reward: 35,
    verses_json: JSON.stringify([
      { text: 'Tụng kinh công đức thù thắng hạnh, vô biên thắng phước giai hồi hướng,', bell: true },
      { text: 'Phổ nguyện pháp giới chư chúng sanh, tốc vãng Vô Lượng Quang Phật sát.', bell: false },
      { text: 'Nguyện tiêu tam chướng trừ phiền não, nguyện đắc trí huệ chơn minh liễu,', bell: false },
      { text: 'Phổ nguyện tội chướng tất tiêu trừ, thế thế thường hành Bồ Tát đạo.', bell: true },
      { text: 'Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.', bell: true }
    ])
  },
  {
    id: 'kinh-duoc-su',
    title: 'Kinh Dược Sư Lưu Ly Quang Như Lai (12 Đại Nguyện Cầu An)',
    category: 'Cầu An & Tiêu Tai',
    duration_sec: 210,
    merit_reward: 93,
    verses_json: JSON.stringify([
      { text: 'Nguyện thứ nhất: Khi thành Phật, thân ta sáng rực khắp vô lượng cõi, ba mươi hai tướng tốt trang nghiêm muôn loài.', bell: true },
      { text: 'Nguyện thứ hai: Thân như ngọc lưu ly trong ngoài sáng suốt, không chút tỳ vết, khai mở trí tuệ phá tan tăm tối.', bell: false },
      { text: 'Nguyện thứ ba: Dùng trí huệ vô biên khiến cho muôn loài thọ dụng vật dụng dồi dào, không hề thiếu thốn.', bell: false },
      { text: 'Nguyện thứ tư: Dẫn dắt người lầm đường lạc lối an trú vào đạo Bồ Đề, tu hành chánh đạo giải thoát viên mãn.', bell: true },
      { text: 'Nguyện thứ năm: Khiến người tu trì giới luật thanh tịnh, lỡ phạm tội lỗi nghe danh hiệu ta liền tiêu trừ nghiệp chướng.', bell: false },
      { text: 'Nguyện thứ sáu: Muôn người thân thể tật nguyền, đui điếc ngọng câm khi nghe danh ta liền được đoan chính khỏe mạnh.', bell: false },
      { text: 'Nguyện thứ bảy: Cứu vớt chúng sanh nghèo khổ bệnh tật không người nương tựa, thân tâm thảnh thơi quyến thuộc sum vầy.', bell: true },
      { text: 'Nguyện thứ tám: Người nữ chịu bao bức bách nghe danh hiệu ta liền chuyển hóa phiền não, đạt quả vị giác ngộ.', bell: false },
      { text: 'Nguyện thứ chín: Thoát khỏi lưới tà kiến ma vương, dứt trừ ác nghiệp, tu tập các hạnh Bồ Tát thanh tịnh.', bell: false },
      { text: 'Nguyện thứ mười: Người mắc tù đày quan tai lao ngục, nghe niệm Dược Sư Như Lai liền được thoát khỏi mọi sự kinh sợ.', bell: true },
      { text: 'Nguyện thứ mười một: Kẻ chịu đói khát bần hàn trước được no đủ mỹ vị, sau thọ dụng pháp vị vi diệu an vui.', bell: false },
      { text: 'Nam mô Bạc già phạt đế, bệ sát xã, lũ rô thích lưu ly, bát lặt bà, hắt ra xà dã, đát tha yết đa da, a ra hắt đế, tam miệu tam bột đà da. Đát điệt tha: Án, bệ sát thệ, bệ sát thệ, bệ sát xã, tam một yết đế toà ha.', bell: true }
    ])
  },
  {
    id: 'kinh-a-di-da',
    title: 'Kinh Phật Thuyết A Di Đà (Tịnh Độ Cực Lạc)',
    category: 'Tịnh Độ Cực Lạc',
    duration_sec: 190,
    merit_reward: 85,
    verses_json: JSON.stringify([
      { text: 'Từ cõi Ta Bà này trải qua mười muôn ức cõi Phật, có thế giới tên là Cực Lạc, giáo chủ hiệu là A Di Đà Phật.', bell: true },
      { text: 'Cõi nước kia vì sao tên Cực Lạc? Chúng sanh trong cõi ấy không có mọi sự khổ, chỉ hưởng những điều vui trọn vẹn.', bell: false },
      { text: 'Lại cõi Cực Lạc có bảy tầng bao lơn, bảy tầng lưới giăng, bảy hàng cây báu, đều bằng bốn ngọc châu báu trang nghiêm vi diệu.', bell: false },
      { text: 'Lại có ao bằng bảy báu, chứa đầy nước tám công đức trong veo thơm mát, đáy ao thuần dùng cát vàng lót trải.', bell: true },
      { text: 'Bốn bên bờ ao đường đi xây bằng vàng bạc lưu ly pha lê; trên bờ có lầu gác nguy nga tráng lệ trang nghiêm.', bell: false },
      { text: 'Hoa sen trong ao to như bánh xe, sắc xanh ánh xanh, sắc vàng ánh vàng, sắc đỏ ánh đỏ, sắc trắng ánh trắng, vi diệu hương khiết.', bell: true },
      { text: 'Cõi Phật ấy ngày đêm sáu thời trời rải hoa mạn đà la, chúng sanh thường lấy vạt áo hứng hoa thơm cúng dường chư Phật.', bell: false },
      { text: 'Lại có vô số chim báu kỳ diệu ngày đêm hòa tiếng hót nhã ca, diễn xướng năm căn, năm lực, bảy bồ đề phần, tám thánh đạo phần.', bell: false },
      { text: 'Chúng sanh nghe tiếng chim hót, gió lay cây báu đều đồng tâm niệm Phật, niệm Pháp, niệm Tăng không gián đoạn.', bell: true },
      { text: 'Nam mô a di đa bà dạ, đá tha già đa dạ, đá địa dạ tha: A di rị đô bà tỳ, a di rị đa tất đam bà tỳ, a di rị đa tì ca lan đế, a di rị đa tì ca lan đa, già di nị, già già na, chỉ đa ca lệ, ta bà ha.', bell: true }
    ])
  },
  {
    id: 'kinh-pho-mon',
    title: 'Kinh Phổ Môn (Quán Thế Âm Bồ Tát Cứu Khổ)',
    category: 'Cầu An & Cứu Khổ',
    duration_sec: 180,
    merit_reward: 65,
    verses_json: JSON.stringify([
      { text: 'Vô Tận Ý Bồ Tát chắp tay bạch Phật: Bạch Thế Tôn, do nhân duyên gì Bồ Tát tên là Quán Thế Âm?', bell: true },
      { text: 'Phật bảo: Nếu có vô lượng muôn ức chúng sanh chịu khổ não, nghe danh Quán Thế Âm một lòng xưng niệm, liền được giải thoát.', bell: false },
      { text: 'Nếu có người gìn giữ danh hiệu Quán Thế Âm Bồ Tát, dầu vào trong lửa lớn, lửa chẳng đốt được nhờ sức oai thần của Bồ Tát.', bell: false },
      { text: 'Nếu trôi dạt trong biển lớn, rồng cá quỷ dữ dập dồn, xưng danh Quán Thế Âm sóng gió liền lặng yên bến bờ an ổn.', bell: true },
      { text: 'Thế Tôn diệu tướng cụ, Ngã kim trùng vấn bỉ, Phật tử hà nhân duyên, Danh vi Quán Thế Âm?', bell: false },
      { text: 'Cụ túc thần thông lực, Quảng tu trí huệ phương, Thập phương chư quốc độ, Vô sát bất hiện thân.', bell: false },
      { text: 'Chúng sanh bị khốn ách, Vô lượng khổ bức thân, Quán Âm diệu trí lực, Năng cứu thế gian khổ.', bell: true },
      { text: 'Địa ngục quỷ súc sanh, Sanh lão bệnh tử khổ, Dĩ thứ tất linh diệt, Chân quán thanh tịnh quán.', bell: false },
      { text: 'Vô cấu thanh tịnh quang, Tuệ nhật phá chư ám, Năng phục tai phong hỏa, Phổ minh chiếu thế gian.', bell: false },
      { text: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát, tầm thinh cứu khổ cứu nạn linh cảm ứng nghiệm.', bell: true }
    ])
  },
  {
    id: 'kinh-vu-lan',
    title: 'Kinh Vu Lan Báo Hiếu (Báo Ân Cha Mẹ)',
    category: 'Hiếu Đạo & Báo Ân',
    duration_sec: 180,
    merit_reward: 76,
    verses_json: JSON.stringify([
      { text: 'Tôn giả Mục Kiền Liên đắc lục thần thông, muốn báo đáp ân cha mẹ sanh thành dưỡng dục vi thâm.', bell: true },
      { text: 'Dùng mắt huệ thấy mẹ hiền nơi ngục ngạ quỷ, không ăn không uống, thân hình tiều tụy gầy mòn ôm nỗi đói khát.', bell: false },
      { text: 'Tôn giả xót thương dâng bát cơm đầy, mẹ nhận bát cơm cơm liền hóa thành than đỏ, chẳng nuốt được vào lòng.', bell: false },
      { text: 'Mục Liên trở về bạch Phật, Thế Tôn dạy: Nghiệp mẹ ông sâu dày, cần sức oai thần chú nguyện của chư Tăng mười phương ngày Tự Tứ.', bell: true },
      { text: 'Rằm tháng Bảy thiết lễ Vu Lan Bồn, cúng dường Tam Bảo chư Tăng thanh tịnh, mẹ ông cùng cửu huyền thất tổ liền thoát cảnh trầm luân.', bell: false },
      { text: 'Ân cha nghĩa mẹ nặng vô cùng, Mười tháng cưu mang chín chữ cù lao, nhọc nhằn sớm tối vì con.', bell: true },
      { text: 'Mẹ nằm chỗ ướt nhường ráo cho con, ngọt bùi phần trẻ, đắng cay phần mình, giọt sữa nuôi con lớn khôn nên vóc dáng.', bell: false },
      { text: 'Dầu cho vai cõng mẹ cha đi khắp bốn biển non cao, xương mòn thịt nát muôn kiếp cũng chưa báo đáp đủ ân sâu.', bell: false },
      { text: 'Nguyện đem thiện căn hiếu đạo hồi hướng mẹ cha hiện tiền trường thọ an khang, quá vãng nhiều đời đồng sanh Tịnh Độ.', bell: true }
    ])
  },
  {
    id: 'sam-hoi-sau-can',
    title: 'Nghi Thức Sám Hối Sáu Căn & Hồng Danh Chư Phật',
    category: 'Sám Hối Tiêu Nghiệp',
    duration_sec: 180,
    merit_reward: 65,
    verses_json: JSON.stringify([
      { text: 'Đệ tử chúng con từ vô thỉ, Gây bao tội ác bởi lầm mê, Đắm trong sanh tử đã bao phen, Nay đến trước Phật thành tâm sám hối.', bell: true },
      { text: 'Mắt đắm sắc trần mê mải nhìn hoa thơm cỏ lạ, khởi niệm tham đắm oán ghét, đệ tử xin chí tâm sám hối căn mắt.', bell: false },
      { text: 'Tai nghe tiếng khen chê lời ong tiếng ve, sinh tâm hoan hỷ giận dữ dấy khởi muôn vàn sân hận, đệ tử xin sám hối căn tai.', bell: false },
      { text: 'Mũi ngửi các mùi hương vị đắm đuối xa hoa, tâm duyên trần cấu chẳng giữ chánh niệm, đệ tử xin sám hối căn mũi.', bell: true },
      { text: 'Miệng thốt lời dối trá, thêu dệt, đâm thọc, độc ác, tham đắm mỹ vị sát sanh hại mạng, đệ tử xin sám hối căn lưỡi.', bell: false },
      { text: 'Thân tạo nghiệp sát sanh, trộm cắp, tà dâm, theo thói buông lung làm khổ muôn loài, đệ tử xin sám hối căn thân.', bell: false },
      { text: 'Ý khởi bao toan tính, ghen tị tham lam, sân hận si mê, ngọn lửa vô minh thiêu rụi rừng công đức, đệ tử xin sám hối căn ý.', bell: true },
      { text: 'Xưa kia tạo bao ác nghiệp đều do vô thỉ tham sân si, từ thân miệng ý phát sinh ra, hết thảy con nay xin sám hối.', bell: false },
      { text: 'Tội từ tâm khởi đem tâm sám, Tâm được tịnh rồi tội liền tiêu; Tội tiêu tâm tịnh thảy đều không, Thế ấy mới là chân sám hối.', bell: true },
      { text: 'Nam mô Cầu Sám Hối Bồ Tát Ma Ha Tát. Nguyện nương hồng danh chư Phật mười phương gia hộ nghiệp chướng tiêu trừ, bồ đề tâm kiên cố.', bell: true }
    ])
  },
  {
    id: 'thap-chu',
    title: 'Thập Chú (Mười Chú Nhỏ Nhập Tâm Tịnh Độ)',
    category: 'Mật Chú & Thần Lực',
    duration_sec: 180,
    merit_reward: 90,
    verses_json: JSON.stringify([
      { text: '1. Như Ý Bảo Luân Vương Đà La Ni: Nam mô Phật đà da, Nam mô Đạt ma da, Nam mô Tăng già da. Nam mô Quán Tự Tại Bồ Tát ma ha tát... Án, bát đạp ma, chấn đa mạt ni, mạo lạt hồng.', bell: true },
      { text: '2. Tiêu Tai Cát Tường Thần Chú: Nẵng mồ tam mãn đa, mẫu đà nẫm, a bát ra để, hạ đa xá, ta nẵng nẫm. Đát điệt tha: Án, khê khê, khê hế, khê hế, hồng hồng, nhập phạ ra, nhập phạ ra, ta bà ha.', bell: false },
      { text: '3. Công Đức Bảo Sơn Thần Chú: Nam mô Phật đà da, Nam mô Đạt ma da, Nam mô Tăng già da. Tất đế hộ rô rô, tất đô rô, chỉ rị bà, kiết rị bà, tất đạt rị, bố rô rị, ta bà ha.', bell: true },
      { text: '4. Phật Mẫu Chuẩn Đề Thần Chú: Khể thủ quy y Tô Tất Đế, đầu diện đảnh lễ Thất Câu Chi. Nam mô tát đa nẫm, tam miệu tam bồ đề, câu chi nẫm. Đát điệt tha: Án, chiết lệ chủ lệ, Chuẩn Đề, ta bà ha.', bell: false },
      { text: '5. Thánh Vô Lượng Thọ Quyết Định Quang Minh Vương Đà La Ni: Án, nại ma ba cát ngoã đế, a ba ra mật đạp, a ưu rị a nạp, tô tất ninh, thật chấp đạp, điệp tả ra giá dã, đát tháp cả đạt dã, a ra ha đế, tam dược tam phật đà dã.', bell: true },
      { text: '6. Dược Sư Quán Đảnh Chân Ngôn: Nam mô Bạc già phạt đế, bệ sát xã, lũ rô thích lưu ly, bát lặt bà, hắt ra xà dã, đát tha yết đa da. Đát điệt tha: Án, bệ sát thệ, bệ sát thệ, bệ sát xã, tam một yết đế toà ha.', bell: false },
      { text: '7. Quán Âm Linh Cảm Chân Ngôn: Án, ma ni bát di hồng, ma hạt nghê nha nạp, tích đế bạt đạt, tích nạp vi đạt, lạt cát thiết năng, tư cát đát, bốc nhị lí, đát cát tháp, bốc nhị nạp, nặc ma rô kiết, thuyết ra da, ta bà ha.', bell: true },
      { text: '8. Thất Phật Diệt Tội Chân Ngôn: Ly bà ly bà đế, cầu ha cầu ha đế, đà ra ni đế, ni ha ra đế, tỳ lê nễ đế, ma ha già đế, chân lăng càn đế, ta bà ha.', bell: false },
      { text: '9. Vãng Sanh Tịnh Độ Thần Chú: Nam mô a di đa bà dạ, đá tha già đa dạ, đá địa dạ tha: A di rị đô bà tỳ, a di rị đa tất đam bà tỳ, a di rị đa tì ca lan đế, a di rị đa tì ca lan đa, già di nị, già già na, chỉ đa ca lệ, ta bà ha.', bell: false },
      { text: '10. Thiện Thiên Nữ Chú: Nam mô Phật đà, Nam mô Đạt ma, Nam mô Tăng già. Nam mô Thất lợi, Ma ha đề tỵ da, đát nễ dã tha, ba lị phú lầu na, giá lị tam mạn đà, đạt xá ni, ma ha tỳ ha la già đế, ta bà ha.', bell: true }
    ])
  },
  {
    id: 'kinh-phap-cu',
    title: 'Kinh Pháp Cú Thiện Ngôn (Dhammapada Tinh Hoa)',
    category: 'Từ Bi & Trí Tuệ',
    duration_sec: 160,
    merit_reward: 60,
    verses_json: JSON.stringify([
      { text: 'Tâm dẫn đầu các pháp, Tâm làm chủ, tâm tạo. Nếu với tâm ô nhiễm, Nói năng hay hành động, Khổ não bước theo sau, Như xe theo dấu vật kéo.', bell: true },
      { text: 'Tâm dẫn đầu các pháp, Tâm làm chủ, tâm tạo. Nếu với tâm thanh tịnh, Nói năng hay hành động, An lạc bước theo sau, Như bóng không rời hình.', bell: false },
      { text: 'Hận thù diệt hận thù, Đời này không thể có; Từ bi diệt hận thù, Là định luật ngàn thu.', bell: true },
      { text: 'Chiến thắng vạn quân thù, Không bằng tự thắng mình; Thắng mình là chiến công, Oanh liệt và tối thượng.', bell: false },
      { text: 'Dầu sống đến trăm năm, Không thấy pháp sanh diệt; Chẳng bằng sống một ngày, Thấy rõ pháp sanh diệt.', bell: false },
      { text: 'Lấy không giận thắng giận, Lấy thiện thắng không thiện, Lấy thí thắng xan tham, Lấy chân thật thắng giả dối.', bell: true },
      { text: 'Chớ khinh điều ác nhỏ, Cho rằng chẳng họa lây; Từng giọt nước nhỏ nhoi, Lâu ngày đầy lu lớn.', bell: false },
      { text: 'Chớ khinh điều thiện nhỏ, Cho rằng không phúc báo; Từng giọt nước tràn đầy, Thiện lành tích thành đại hải.', bell: false },
      { text: 'Không làm mọi điều ác, Thành tựu các hạnh lành, Tâm ý giữ trong sạch, Chính lời chư Phật dạy.', bell: true },
      { text: 'Tinh cần đường bất tử, Phóng dật cửa tử vong. Người tinh cần không chết, Kẻ phóng dật như đã chết rồi.', bell: true }
    ])
  }
];

export const DEFAULT_DIOCESES = [
  ['HN', 'Tổng Giáo Phận Hà Nội', 'BẮC'],
  ['BN', 'Giáo Phận Bắc Ninh', 'BẮC'],
  ['BC', 'Giáo Phận Bùi Chu', 'BẮC'],
  ['HP', 'Giáo Phận Hải Phòng', 'BẮC'],
  ['HTI', 'Giáo Phận Hà Tĩnh', 'BẮC'],
  ['HH', 'Giáo Phận Hưng Hóa', 'BẮC'],
  ['LS', 'Giáo Phận Lạng Sơn - Cao Bằng', 'BẮC'],
  ['PD', 'Giáo Phận Phát Diệm', 'BẮC'],
  ['TB', 'Giáo Phận Thái Bình', 'BẮC'],
  ['TH', 'Giáo Phận Thanh Hóa', 'BẮC'],
  ['VI', 'Giáo Phận Vinh', 'BẮC'],
  ['HUE', 'Tổng Giáo Phận Huế', 'TRUNG'],
  ['BMT', 'Giáo Phận Ban Mê Thuột', 'TRUNG'],
  ['DN', 'Giáo Phận Đà Nẵng', 'TRUNG'],
  ['KT', 'Giáo Phận Kon Tum', 'TRUNG'],
  ['NT', 'Giáo Phận Nha Trang', 'TRUNG'],
  ['QN', 'Giáo Phận Quy Nhơn', 'TRUNG'],
  ['SG', 'Tổng Giáo Phận TP. Hồ Chí Minh', 'NAM'],
  ['BR', 'Giáo Phận Bà Rịa', 'NAM'],
  ['CT', 'Giáo Phận Cần Thơ', 'NAM'],
  ['DL', 'Giáo Phận Đà Lạt', 'NAM'],
  ['LX', 'Giáo Phận Long Xuyên', 'NAM'],
  ['MT', 'Giáo Phận Mỹ Tho', 'NAM'],
  ['PT', 'Giáo Phận Phan Thiết', 'NAM'],
  ['PC', 'Giáo Phận Phú Cường', 'NAM'],
  ['VL', 'Giáo Phận Vĩnh Long', 'NAM'],
  ['XL', 'Giáo Phận Xuân Lộc', 'NAM']
];

export const DEFAULT_SCRIPTURES = [
  {
    id: 1,
    theme_title: 'Bình An Trong Tay Chúa',
    bible_verse: 'Thầy để lại bình an cho anh em, Thầy ban cho anh em bình an của Thầy. Thầy ban cho anh em không theo kiểu thế gian. Lòng anh em đừng xao xuyến cũng đừng sợ hãi.',
    reference_book: 'Gioan 14:27',
    reflection: 'Hôm nay, hãy trao phó mọi nỗi lo âu, gánh nặng của công việc và gia đình cho Chúa. Ngài đang ở cùng bạn trong từng nhịp thở.'
  },
  {
    id: 2,
    theme_title: 'Ánh Sáng Soi Đường',
    bible_verse: 'Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường cho con đi.',
    reference_book: 'Thánh Vịnh 119:105',
    reflection: 'Khi đứng trước những quyết định khó khăn, hãy dành một phút thinh lặng cầu nguyện. Chúa Thánh Thần sẽ soi sáng giúp bạn chọn con đường ngay chính.'
  },
  {
    id: 3,
    theme_title: 'Tình Yêu Kiên Nhẫn & Nhân Hậu',
    bible_verse: 'Đức mến thì nhẫn nhục, hiền hậu, không ghen tương, không vênh vang, không tự đắc, không làm điều bất chính, không tìm tư lợi.',
    reference_book: '1 Côrintô 13:4-5',
    reflection: 'Hãy bắt đầu ngày mới bằng một nụ cười hiền hòa và lời nói yêu thương với những người thân yêu quanh mình.'
  },
  {
    id: 4,
    theme_title: 'Trông Cậy Vào Hồng Ân',
    bible_verse: 'Đức Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì. Trong đồng cỏ xanh tươi, Người cho tôi nằm nghỉ.',
    reference_book: 'Thánh Vịnh 23:1-2',
    reflection: 'Thiên Chúa luôn quan phòng và chăm sóc cuộc đời bạn. Đừng nản lòng trước thử thách tạm thời, vì ân sủng của Ngài luôn đủ cho bạn.'
  },
  {
    id: 5,
    theme_title: 'Sức Mạnh Của Lời Cầu Nguyện',
    bible_verse: 'Anh em cứ xin thì sẽ được, cứ tìm thì sẽ thấy, cứ gõ cửa thì sẽ mở cho.',
    reference_book: 'Mátthêu 7:7',
    reflection: 'Không có lời cầu nguyện chân thành nào bị lãng quên trước nhan Chúa. Hãy kiên trì cầu xin với lòng tín thác trọn vẹn.'
  },
  {
    id: 6,
    theme_title: 'Đôi Cánh Phượng Hoàng',
    bible_verse: 'Những ai cậy trông Đức Chúa thì được thêm sức mạnh. Họ sẽ tung cánh bay cao như phượng hoàng, chạy mà không mỏi mệt, đi mà không kiệt sức.',
    reference_book: 'Isaia 40:31',
    reflection: 'Dù thân xác hay tinh thần có lúc mỏi mệt, niềm cậy trông vào Chúa sẽ tiếp thêm nguồn sinh lực mới để bạn vượt qua mọi dốc cao.'
  },
  {
    id: 7,
    theme_title: 'Lòng Thương Xót Vô Biên',
    bible_verse: 'Tình thương Đức Chúa đời đời không dứt, lòng thương xót của Người mãi mãi chẳng vơi; mỗi buổi mai lại thêm mới mẻ.',
    reference_book: 'Ai Ca 3:22-23',
    reflection: 'Mỗi bình minh thức dậy là một hồng ân mới mẻ. Hãy mở lòng đón nhận sự tha thứ và bình an của Chúa để làm mới cuộc đời mình.'
  },
  {
    id: 8,
    theme_title: 'Tất Cả Nhờ Đấng Ban Sức Mạnh',
    bible_verse: 'Tôi có thể làm được mọi sự trong Đấng ban sức mạnh cho tôi.',
    reference_book: 'Philípphê 4:13',
    reflection: 'Khi bạn kết hợp mật thiết với Đức Kitô, không có thử thách nào là quá sức. Hãy vững vàng tiến bước với niềm tin sắt đá.'
  },
  {
    id: 9,
    theme_title: 'Chương Trình Bình An & Hy Vọng',
    bible_verse: 'Vì chính Ta biết các kế hoạch Ta định làm cho các ngươi: kế hoạch thịnh vượng chứ không phải tai ương, để ban cho các ngươi một tương lai và một niềm hy vọng.',
    reference_book: 'Giêrêmia 29:11',
    reflection: 'Thiên Chúa luôn có một kế hoạch tốt đẹp cho cuộc đời bạn. Hãy kiên nhẫn và phó thác tương lai trong bàn tay yêu thương của Ngài.'
  },
  {
    id: 10,
    theme_title: 'Hãy Đến Với Trái Tim Chúa',
    bible_verse: 'Tất cả những ai đang vất vả mang gánh nặng nề, hãy đến cùng tôi, tôi sẽ cho nghỉ ngơi bồi dưỡng.',
    reference_book: 'Mátthêu 11:28',
    reflection: 'Hãy quỳ gối trước Thánh Thể và đặt mọi gánh nặng xuống chân bàn thờ. Trái Tim Chúa Giêsu luôn rộng mở đón nhận và nâng đỡ bạn.'
  }
];

export const DEFAULT_PRAYERS = [
  {
    id: 'nam-dau-thanh-kinh-sang',
    title: 'Nghi Thức Đầu Thánh & Kinh Sáng',
    category: 'Kinh Nguyện Hằng Ngày',
    duration_sec: 150,
    grace_reward: 48,
    verses_json: JSON.stringify([
      { text: 'Nhân danh Cha và Con và Thánh Thần. Amen.', chime: true, beadType: 'CROSS' },
      { text: 'Lạy Chúa Thánh Thần, xin ngự đến, và từ trời cao xin chiếu tỏa ánh quang của Ngài.', chime: false, beadType: 'PATER' },
      { text: 'Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng, nước Cha trị đến, ý Cha thể hiện dưới đất cũng như trên trời.', chime: true, beadType: 'PATER' },
      { text: 'Xin Cha cho chúng con hôm nay lương thực hằng ngày, và tha nợ chúng con như chúng con cũng tha kẻ có nợ chúng con.', chime: false, beadType: 'PATER' },
      { text: 'Xin chớ để chúng con sa chước cám dỗ, nhưng cứu chúng con cho khỏi sự dữ. Amen.', chime: true, beadType: 'PATER' },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.', chime: false, beadType: 'AVE' },
      { text: 'Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.', chime: true, beadType: 'AVE' },
      { text: 'Sáng danh Đức Chúa Cha và Đức Chúa Con và Đức Chúa Thánh Thần. Như đã có trước vô cùng và bây giờ và hằng có và đời đời chẳng cùng. Amen.', chime: true, beadType: 'GLORIA' }
    ])
  },
  {
    id: 'kinh-truyen-tin-angelus',
    title: 'Kinh Truyền Tin (Angelus - Sáng / Trưa / Chiều)',
    category: 'Kinh Truyền Tin',
    duration_sec: 140,
    grace_reward: 46,
    verses_json: JSON.stringify([
      { text: 'Đức Chúa Trời sai Thánh Thiên Thần truyền tin cho Rất Thánh Đức Bà Maria. Và Rất Thánh Đức Bà chịu thai bởi phép Đức Chúa Thánh Thần.', chime: true, beadType: 'ANGELUS' },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.', chime: false, beadType: 'AVE' },
      { text: 'Này tôi là tôi tá Đức Chúa Trời. Tôi xin vâng như lời Thánh Thiên Thần truyền.', chime: true, beadType: 'ANGELUS' },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.', chime: false, beadType: 'AVE' },
      { text: 'Chốc ấy Ngôi Thứ Hai xuống thế làm người. Và ở cùng chúng con.', chime: true, beadType: 'ANGELUS' },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà... Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.', chime: false, beadType: 'AVE' },
      { text: 'Lạy Rất Thánh Đức Mẹ Chúa Trời, xin cầu cho chúng con. Đáng chịu lấy những sự Chúa Kitô đã hứa.', chime: true, beadType: 'GLORIA' },
      { text: 'Chúng con lạy ơn Đức Chúa Trời, xin ban ơn xuống trong linh hồn chúng con, để nhờ sự thương khó và Thánh Giá Chúa Kitô, chúng con được sống lại hiển vinh. Amen.', chime: true, beadType: 'CROSS' }
    ])
  },
  {
    id: 'kinh-man-coi-nam-su-vui',
    title: 'Chuỗi Mân Côi - Năm Sự Vui (Kính Đức Mẹ)',
    category: 'Chuỗi Mân Côi',
    duration_sec: 210,
    grace_reward: 79,
    verses_json: JSON.stringify([
      { text: 'Thứ nhất thì ngắm: Thiên Thần truyền tin cho Đức Bà chịu thai. Ta hãy xin cho được ở khiêm nhường.', chime: true, beadType: 'MYSTERY' },
      { text: 'Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng... Xin cứu chúng con cho khỏi sự dữ. Amen.', chime: false, beadType: 'PATER' },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ và Giêsu con lòng Bà gồm phúc lạ. Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi nay và trong giờ lâm tử. Amen.', chime: true, beadType: 'AVE' },
      { text: 'Thứ hai thì ngắm: Đức Bà đi viếng Bà Thánh Isave. Ta hãy xin cho được lòng yêu người.', chime: true, beadType: 'MYSTERY' },
      { text: 'Thứ ba thì ngắm: Đức Bà sinh Đức Chúa Giêsu nơi hang đá. Ta hãy xin cho được lòng khó khăn.', chime: true, beadType: 'MYSTERY' },
      { text: 'Thứ tư thì ngắm: Đức Bà dâng Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được vâng lời chịu lụy.', chime: true, beadType: 'MYSTERY' },
      { text: 'Thứ năm thì ngắm: Đức Bà tìm được Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được giữ nghĩa cùng Chúa luôn.', chime: true, beadType: 'MYSTERY' },
      { text: 'Sáng danh Đức Chúa Cha và Đức Chúa Con và Đức Chúa Thánh Thần. Như đã có trước vô cùng và bây giờ và hằng có và đời đời chẳng cùng. Amen.', chime: true, beadType: 'GLORIA' },
      { text: 'Lạy Chúa Giêsu, xin tha tội cho chúng con, xin cứu chúng con khỏi sa hỏa ngục, xin đem các linh hồn lên Thiên Đàng, nhất là những linh hồn cần đến lòng Chúa thương xót hơn. Amen.', chime: true, beadType: 'FATIMA' }
    ])
  },
  {
    id: 'chuoi-long-chua-thuong-xot',
    title: 'Chuỗi Kinh Lòng Chúa Thương Xót (Giờ 3 Giờ Chiều)',
    category: 'Lòng Chúa Thương Xót',
    duration_sec: 180,
    grace_reward: 61,
    verses_json: JSON.stringify([
      { text: 'Lạy Cha Hằng Hữu, con xin dâng lên Cha Mình và Máu, Linh Hồn và Thần Tính của Con Rất Yêu Dấu Cha là Đức Giêsu Kitô, Chúa chúng con, để đền vì tội lỗi chúng con và toàn thế giới.', chime: true, beadType: 'PATER' },
      { text: 'Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót chúng con và toàn thế giới.', chime: false, beadType: 'AVE' },
      { text: 'Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót gia đình chúng con và những người đang đau yếu.', chime: false, beadType: 'AVE' },
      { text: 'Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót các linh hồn nơi Luyện Ngục và ban bình an cho thế giới.', chime: true, beadType: 'AVE' },
      { text: 'Lạy Đấng Chí Thánh, là Thiên Chúa Toàn Năng Hằng Hữu, xin thương xót chúng con và toàn thế giới. (3 lần)', chime: true, beadType: 'GLORIA' },
      { text: 'Lạy Chúa Giêsu, con tín thác vào Chúa! Lạy Máu và Nước tuôn trào từ Trái Tim Chúa Giêsu như thác nguồn thương xót chúng con, con tín thác vào Chúa!', chime: true, beadType: 'CROSS' }
    ])
  },
  {
    id: 'kinh-hoa-binh-thanh-phanxico',
    title: 'Kinh Hòa Bình (Thánh Phanxicô Assisi) & Kinh Tối',
    category: 'Kinh Hòa Bình & Tạ Ơn',
    duration_sec: 150,
    grace_reward: 48,
    verses_json: JSON.stringify([
      { text: 'Lạy Chúa từ nhân, xin cho con biết mến yêu và phụng sự Chúa trong mọi người.', chime: true, beadType: 'CROSS' },
      { text: 'Lạy Chúa, xin hãy dùng con như khí cụ bình an của Chúa: Đem yêu thương vào nơi oán thù, đem thứ tha vào nơi lăng nhục.', chime: false, beadType: 'AVE' },
      { text: 'Đem an hòa vào nơi tranh chấp, đem chân lý vào chốn lỗi lầm.', chime: false, beadType: 'AVE' },
      { text: 'Đem tin kính vào nơi nghi nan, chiếu trông cậy vào nơi thất vọng.', chime: true, beadType: 'AVE' },
      { text: 'Để con dọi ánh sáng vào nơi tối tăm, đem niềm vui đến chốn u sầu.', chime: false, beadType: 'AVE' },
      { text: 'Lạy Chúa, xin hãy dạy con: Tìm an ủi người hơn được người ủi an, tìm hiểu biết người hơn được người hiểu biết, tìm yêu mến người hơn được người mến yêu.', chime: true, beadType: 'PATER' },
      { text: 'Vì chính khi hiến thân là khi được nhận lãnh, chính lúc quên mình là lúc gặp lại bản thân.', chime: false, beadType: 'AVE' },
      { text: 'Bởi chính khi thứ tha là khi được tha thứ, chính lúc chết đi là khi vui sống muôn đời. Amen.', chime: true, beadType: 'GLORIA' }
    ])
  }
];

export class DatabaseManager {
  constructor() {
    this.pool = null;
    this.usingMemory = false;
    this.disableDiskStore = false;

    // In-memory fallback stores (Chùa Online)
    this.memUsers = new Map(); // id -> user
    this.memUsersByRecovery = new Map(); // UPPER(recovery_code) -> id
    this.memNextUserId = 1;
    this.memWishes = [];
    this.memNextWishId = 1;
    this.memProvinces = new Map();
    this.memFortunes = [...DEFAULT_FORTUNES];
    this.memSutras = [...DEFAULT_SUTRAS];
    this.memChatMessages = []; // Bounded up to 200 recent messages across rooms
    this.chatDiskPath = path.resolve(__dirname, '../data/persistent_chat_history.json');
    this.storeDiskPath = path.resolve(__dirname, '../data/persistent_store.json');

    // In-memory fallback stores (Nhà Thờ Công Giáo Online)
    this.memChurchUsers = new Map(); // id -> user
    this.memChurchUsersByRecovery = new Map(); // UPPER(recovery_code) -> id
    this.memNextChurchUserId = 1;
    this.memIntentions = [];
    this.memNextIntentionId = 1;
    this.memDioceses = new Map();
    this.memScriptures = [...DEFAULT_SCRIPTURES];
    this.memPrayers = [...DEFAULT_PRAYERS];

    this._initMemoryDefaults();
    this._loadDiskStore();
    this._loadDiskChatHistory();
  }

  _loadDiskStore() {
    if (this.disableDiskStore) return;
    try {
      if (!fs.existsSync(this.storeDiskPath)) return;
      const raw = fs.readFileSync(this.storeDiskPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      if (Array.isArray(parsed.users)) {
        this.memUsers.clear();
        this.memUsersByRecovery.clear();
        let maxId = 0;
        for (const u of parsed.users) {
          if (!u || !u.id || !u.recovery_code) continue;
          const uid = Number(u.id);
          if (uid > maxId) maxId = uid;
          this.memUsers.set(uid, u);
          this.memUsersByRecovery.set(String(u.recovery_code).toUpperCase(), uid);
        }
        this.memNextUserId = Math.max(this.memNextUserId, maxId + 1);
      }

      if (Array.isArray(parsed.provinces)) {
        for (const p of parsed.provinces) {
          if (p && p.province_code && this.memProvinces.has(p.province_code)) {
            const cur = this.memProvinces.get(p.province_code);
            cur.total_merit = Number(p.total_merit || 0);
          }
        }
      }

      if (Array.isArray(parsed.wishes)) {
        const now = Date.now();
        this.memWishes = parsed.wishes
          .filter((w) => w && (!w.expires_at || new Date(w.expires_at).getTime() > now))
          .slice(0, 100);
        const maxWishId = this.memWishes.reduce((m, w) => Math.max(m, Number(w.id || 0)), 0);
        this.memNextWishId = Math.max(this.memNextWishId, maxWishId + 1);
      }

      if (Array.isArray(parsed.churchUsers)) {
        this.memChurchUsers.clear();
        this.memChurchUsersByRecovery.clear();
        let maxCId = 0;
        for (const u of parsed.churchUsers) {
          if (!u || !u.id || !u.recovery_code) continue;
          const uid = Number(u.id);
          if (uid > maxCId) maxCId = uid;
          this.memChurchUsers.set(uid, u);
          this.memChurchUsersByRecovery.set(String(u.recovery_code).toUpperCase(), uid);
        }
        this.memNextChurchUserId = Math.max(this.memNextChurchUserId, maxCId + 1);
      }

      if (Array.isArray(parsed.dioceses)) {
        for (const d of parsed.dioceses) {
          if (d && d.diocese_code && this.memDioceses.has(d.diocese_code)) {
            const cur = this.memDioceses.get(d.diocese_code);
            cur.total_grace = Number(d.total_grace || 0);
          }
        }
      }

      if (Array.isArray(parsed.intentions)) {
        const now = Date.now();
        this.memIntentions = parsed.intentions
          .filter((it) => it && (!it.expires_at || new Date(it.expires_at).getTime() > now))
          .slice(0, 100);
        const maxIntId = this.memIntentions.reduce((m, it) => Math.max(m, Number(it.id || 0)), 0);
        this.memNextIntentionId = Math.max(this.memNextIntentionId, maxIntId + 1);
      }
    } catch (err) {
      console.warn('[DB] _loadDiskStore warning:', err.message);
    }
  }

  _saveDiskStore() {
    if (this.disableDiskStore) return;
    try {
      const dir = path.dirname(this.storeDiskPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        updatedAt: Date.now(),
        users: Array.from(this.memUsers.values()),
        provinces: Array.from(this.memProvinces.values()),
        wishes: this.memWishes.slice(0, 100),
        churchUsers: Array.from(this.memChurchUsers.values()),
        dioceses: Array.from(this.memDioceses.values()),
        intentions: this.memIntentions.slice(0, 100)
      };
      const tmpPath = `${this.storeDiskPath}.tmp.${process.pid}`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storeDiskPath);
    } catch (err) {
      // Non-fatal in read-only environments
    }
  }

  _loadDiskChatHistory() {
    try {
      if (fs.existsSync(this.chatDiskPath)) {
        const raw = fs.readFileSync(this.chatDiskPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memChatMessages = parsed.slice(-200);
          return;
        }
      }
    } catch (err) {
      console.warn('[DB] _loadDiskChatHistory warning:', err.message);
    }

    // Seed welcoming initial Dharma messages so the chat room is never blank
    const now = Date.now();
    this.memChatMessages = [
      {
        id: 'seed-chat-1',
        userId: 0,
        dharmaName: 'Thích Tâm Tịnh',
        provinceCode: 'TTH',
        roomId: 'chanh-dien-1',
        text: '🙏 Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. Chào mừng chư vị đạo hữu về Đạo Tràng Chánh Điện!',
        flagged: false,
        timestamp: now - 180000
      },
      {
        id: 'seed-chat-2',
        userId: 0,
        dharmaName: 'Diệu Liên Hoa',
        provinceCode: 'SG',
        roomId: 'chanh-dien-1',
        text: '🪷 Nguyện cầu quốc thái dân an,家 đạo bình an, muôn loài đồng sanh Cực Lạc.',
        flagged: false,
        timestamp: now - 60000
      }
    ];
    this._saveDiskChatHistory();
  }

  _saveDiskChatHistory() {
    try {
      const dir = path.dirname(this.chatDiskPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.chatDiskPath,
        JSON.stringify(this.memChatMessages.slice(-200), null, 2),
        'utf8'
      );
    } catch (err) {
      // Non-fatal in read-only environments
    }
  }

  _initMemoryDefaults() {
    for (const [code, name] of DEFAULT_PROVINCES) {
      this.memProvinces.set(code, {
        province_code: code,
        province_name: name,
        total_merit: 0
      });
    }
    for (const [code, name, province] of DEFAULT_DIOCESES) {
      this.memDioceses.set(code, {
        diocese_code: code,
        diocese_name: name,
        ecclesiastical_province: province,
        total_grace: 0
      });
    }
  }

  forceMemoryMode(isolateForTest = true) {
    this.usingMemory = true;
    this.disableDiskStore = Boolean(isolateForTest);
    if (isolateForTest) {
      this.memUsers.clear();
      this.memUsersByRecovery.clear();
      this.memNextUserId = 1;
      this.memWishes = [];
      this.memNextWishId = 1;
      this.memChurchUsers.clear();
      this.memChurchUsersByRecovery.clear();
      this.memNextChurchUserId = 1;
      this.memIntentions = [];
      this.memNextIntentionId = 1;
      this._initMemoryDefaults();
    }
  }

  isUsingMemory() {
    return this.usingMemory;
  }

  async initDatabase() {
    if (this.usingMemory) {
      console.log('[DB] Running in forced In-Memory Fallback mode.');
      return { mode: 'memory' };
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASS ?? '';
    const database = process.env.DB_NAME || 'chua_online';

    try {
      this.pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
        charset: 'utf8mb4'
      });

      const conn = await this.pool.getConnection();
      try {
        await this._ensureSchemaAndSeed(conn);
        console.log(`[DB] Connected to MySQL Online (${host}:${port} / ${database})`);
        this.usingMemory = false;
        return { mode: 'mysql', host, database };
      } finally {
        conn.release();
      }
    } catch (err) {
      console.warn(
        `[DB] MySQL connection to ${host}:${port} failed (${err.message}). Automatically switching to In-Memory Fallback mode!`
      );
      this.usingMemory = true;
      return { mode: 'memory', error: err.message };
    }
  }

  async _ensureSchemaAndSeed(conn) {
    // 1. users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recovery_code VARCHAR(64) UNIQUE NOT NULL,
        dharma_name VARCHAR(50) NOT NULL,
        password_hash VARCHAR(128) DEFAULT NULL,
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
    `);
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(128) DEFAULT NULL`);
    } catch (_) {
      // Column already exists
    }

    // 2. wishes_wall table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS wishes_wall (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        dharma_name VARCHAR(50) NOT NULL,
        wish_type VARCHAR(24) NOT NULL,
        content VARCHAR(200) NOT NULL,
        pos_x FLOAT DEFAULT 0,
        pos_z FLOAT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active_wishes (wish_type, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    try {
      await conn.query(`ALTER TABLE wishes_wall MODIFY COLUMN wish_type VARCHAR(24) NOT NULL`);
    } catch (_) {
      // Ignore if already modified
    }

    // 3. province_merits table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS province_merits (
        province_code VARCHAR(10) PRIMARY KEY,
        province_name VARCHAR(50) NOT NULL,
        total_merit BIGINT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. daily_fortunes table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_fortunes (
        id INT PRIMARY KEY,
        rank_title VARCHAR(50) NOT NULL,
        poem TEXT NOT NULL,
        interpretation TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. sutras table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sutras (
        id VARCHAR(32) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        duration_sec INT NOT NULL,
        merit_reward INT NOT NULL,
        verses_json JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. chat_messages table (persistent multi-user chat history across refreshes & restarts)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        msg_id VARCHAR(64) NOT NULL,
        room_id VARCHAR(32) DEFAULT 'chanh-dien-1',
        user_id VARCHAR(64) DEFAULT '0',
        dharma_name VARCHAR(50) NOT NULL,
        province_code VARCHAR(10) DEFAULT 'SG',
        content VARCHAR(200) NOT NULL,
        flagged TINYINT(1) DEFAULT 0,
        created_at_ms BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room_time (room_id, id DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed 63 provinces
    const provValues = DEFAULT_PROVINCES.map(([c, n]) => [c, n, 0]);
    await conn.query(
      `INSERT IGNORE INTO province_merits (province_code, province_name, total_merit) VALUES ?`,
      [provValues]
    );

    // Seed fortunes
    for (const f of DEFAULT_FORTUNES) {
      await conn.query(
        `INSERT IGNORE INTO daily_fortunes (id, rank_title, poem, interpretation) VALUES (?, ?, ?, ?)`,
        [f.id, f.rank_title, f.poem, f.interpretation]
      );
    }

    // Seed sutras
    for (const s of DEFAULT_SUTRAS) {
      await conn.query(
        `INSERT IGNORE INTO sutras (id, title, category, duration_sec, merit_reward, verses_json) VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.title, s.category, s.duration_sec, s.merit_reward, s.verses_json]
      );
    }

    // ------------------------------------------------------------------
    // CATHOLIC TABLES (Nhà Thờ Công Giáo Online 3D)
    // ------------------------------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS nhatho_users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recovery_code VARCHAR(64) UNIQUE NOT NULL,
        christian_name VARCHAR(50) NOT NULL,
        password_hash VARCHAR(128) DEFAULT NULL,
        outfit_color VARCHAR(16) DEFAULT '#f5f0e6',
        avatar_style VARCHAR(32) DEFAULT 'GIAO_DAN_AO_DAI',
        diocese_code VARCHAR(10) DEFAULT 'SG',
        grace_points BIGINT DEFAULT 0,
        rosaries_completed INT DEFAULT 0,
        garden_tended INT DEFAULT 0,
        virtue_tier INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_grace_leaderboard (grace_points DESC),
        INDEX idx_diocese (diocese_code, grace_points DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS prayer_intentions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        christian_name VARCHAR(50) NOT NULL,
        intention_type ENUM('CANDLE', 'ROSE') NOT NULL,
        content VARCHAR(200) NOT NULL,
        pos_x FLOAT DEFAULT 0,
        pos_z FLOAT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active_intentions (intention_type, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS diocese_bouquets (
        diocese_code VARCHAR(10) PRIMARY KEY,
        diocese_name VARCHAR(60) NOT NULL,
        ecclesiastical_province ENUM('BẮC', 'TRUNG', 'NAM') DEFAULT 'NAM',
        total_grace BIGINT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_scriptures (
        id INT PRIMARY KEY,
        theme_title VARCHAR(80) NOT NULL,
        bible_verse TEXT NOT NULL,
        reference_book VARCHAR(50) NOT NULL,
        reflection TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS prayer_catalog (
        id VARCHAR(40) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        duration_sec INT NOT NULL,
        grace_reward INT NOT NULL,
        verses_json JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed 27 dioceses
    const dioceseValues = DEFAULT_DIOCESES.map(([code, name, prov]) => [code, name, prov, 0]);
    await conn.query(
      `INSERT IGNORE INTO diocese_bouquets (diocese_code, diocese_name, ecclesiastical_province, total_grace) VALUES ?`,
      [dioceseValues]
    );

    // Seed daily scriptures
    for (const sc of DEFAULT_SCRIPTURES) {
      await conn.query(
        `INSERT IGNORE INTO daily_scriptures (id, theme_title, bible_verse, reference_book, reflection) VALUES (?, ?, ?, ?, ?)`,
        [sc.id, sc.theme_title, sc.bible_verse, sc.reference_book, sc.reflection]
      );
    }

    // Seed prayer catalog
    for (const pr of DEFAULT_PRAYERS) {
      await conn.query(
        `INSERT IGNORE INTO prayer_catalog (id, title, category, duration_sec, grace_reward, verses_json) VALUES (?, ?, ?, ?, ?, ?)`,
        [pr.id, pr.title, pr.category, pr.duration_sec, pr.grace_reward, pr.verses_json]
      );
    }
  }

  /**
   * Pool-compatible getConnection() for MeritBatcher & GraceBatcher transaction batching
   */
  async getConnection() {
    if (!this.usingMemory && this.pool) {
      try {
        return await this.pool.getConnection();
      } catch (err) {
        console.warn('[DB] getConnection fallback to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Mock connection for In-Memory mode supporting beginTransaction, query, commit, rollback, release
    const self = this;
    return {
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
      async query(sql, params = []) {
        return self._handleMemoryQuery(sql, params);
      }
    };
  }

  async _handleMemoryQuery(sql, params = []) {
    const normalized = sql.trim().replace(/\s+/g, ' ').toUpperCase();
    if (normalized.startsWith('UPDATE USERS SET MERIT_POINTS')) {
      const delta = Number(params[0] || 0);
      const userId = Number(params[params.length - 1]);
      const u = this.memUsers.get(userId);
      if (u) {
        u.merit_points += delta;
        if (params.length >= 5) {
          u.sutras_completed += Number(params[1] || 0);
          u.leaves_swept += Number(params[2] || 0);
          u.realm_level = Math.max(u.realm_level, Number(params[3] || 1));
        }
        this._saveDiskStore();
      }
      return [{ affectedRows: u ? 1 : 0 }];
    }
    if (normalized.startsWith('UPDATE PROVINCE_MERITS SET TOTAL_MERIT')) {
      const delta = Number(params[0] || 0);
      const code = String(params[1] || 'SG');
      const p = this.memProvinces.get(code);
      if (p) {
        p.total_merit += delta;
        this._saveDiskStore();
      }
      return [{ affectedRows: p ? 1 : 0 }];
    }
    if (normalized.startsWith('UPDATE NHATHO_USERS SET GRACE_POINTS')) {
      const delta = Number(params[0] || 0);
      const userId = Number(params[params.length - 1]);
      const u = this.memChurchUsers.get(userId);
      if (u) {
        u.grace_points += delta;
        if (params.length >= 5) {
          u.rosaries_completed += Number(params[1] || 0);
          u.garden_tended += Number(params[2] || 0);
          u.virtue_tier = Math.max(u.virtue_tier, Number(params[3] || 1));
        }
        this._saveDiskStore();
      }
      return [{ affectedRows: u ? 1 : 0 }];
    }
    if (normalized.startsWith('UPDATE DIOCESE_BOUQUETS SET TOTAL_GRACE')) {
      const delta = Number(params[0] || 0);
      const code = String(params[1] || 'SG');
      const d = this.memDioceses.get(code);
      if (d) {
        d.total_grace += delta;
        this._saveDiskStore();
      }
      return [{ affectedRows: d ? 1 : 0 }];
    }
    return [[]];
  }

  _formatTempleUser(u) {
    return {
      id: Number(u.id),
      recoveryCode: u.recovery_code,
      dharmaName: u.dharma_name,
      robeColor: u.robe_color || '#5c6b73',
      provinceCode: u.province_code || 'SG',
      avatarStyle: u.avatar_style || 'AO_LAM',
      companionType: u.companion_type || 'NONE',
      lotusFootsteps: u.lotus_footsteps !== undefined ? Boolean(u.lotus_footsteps) : true,
      headwearType: u.headwear_type || 'NONE',
      meritPoints: Number(u.merit_points || 0),
      sutrasCompleted: Number(u.sutras_completed || 0),
      leavesSwept: Number(u.leaves_swept || 0),
      realmLevel: Number(u.realm_level || 1),
      isRegistered: Boolean(u.password_hash)
    };
  }

  async getOrCreateUser({
    recoveryCode,
    dharmaName = 'Thiện Tâm',
    robeColor = '#5c6b73',
    provinceCode = 'SG',
    avatarStyle = 'AO_LAM',
    companionType = 'NONE',
    lotusFootsteps = true,
    headwearType = 'NONE',
    meritPoints = 0,
    sutrasCompleted = 0,
    leavesSwept = 0,
    realmLevel = 1
  }) {
    const cleanCode = String(recoveryCode || `GUEST-${Date.now()}-${Math.random()}`).trim().slice(0, 64);
    const cleanCodeKey = cleanCode.toUpperCase();
    const cleanName = String(dharmaName || 'Thiện Tâm').trim().slice(0, 50) || 'Thiện Tâm';
    const cleanColor = String(robeColor || '#5c6b73').slice(0, 16);
    const cleanProv = String(provinceCode || 'SG').slice(0, 10);
    const cleanStyle = String(avatarStyle || 'AO_LAM').slice(0, 32);
    const cleanCompanion = String(companionType || 'NONE').slice(0, 24);
    const cleanLotus = lotusFootsteps !== undefined ? Boolean(lotusFootsteps) : true;
    const cleanHeadwear = String(headwearType || 'NONE').slice(0, 24);
    const initMerit = Math.max(0, Number(meritPoints || 0));
    const initSutras = Math.max(0, Number(sutrasCompleted || 0));
    const initLeaves = Math.max(0, Number(leavesSwept || 0));
    const initRealm = Math.max(1, Number(realmLevel || 1));

    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT * FROM users WHERE UPPER(recovery_code) = UPPER(?) LIMIT 1`,
          [cleanCode]
        );
        if (rows.length > 0) {
          const u = rows[0];
          const mergedMerit = Math.max(Number(u.merit_points || 0), initMerit);
          const mergedRealm = Math.max(Number(u.realm_level || 1), initRealm);
          if (mergedMerit > Number(u.merit_points || 0) || mergedRealm > Number(u.realm_level || 1)) {
            await this.pool.query(
              `UPDATE users SET merit_points = ?, realm_level = ? WHERE id = ?`,
              [mergedMerit, mergedRealm, u.id]
            );
            u.merit_points = mergedMerit;
            u.realm_level = mergedRealm;
          }
          return this._formatTempleUser(u);
        }

        const [res] = await this.pool.query(
          `INSERT INTO users (recovery_code, dharma_name, robe_color, province_code, merit_points, sutras_completed, leaves_swept, realm_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cleanCode, cleanName, cleanColor, cleanProv, initMerit, initSutras, initLeaves, initRealm]
        );
        return {
          id: Number(res.insertId),
          recoveryCode: cleanCode,
          dharmaName: cleanName,
          robeColor: cleanColor,
          provinceCode: cleanProv,
          avatarStyle: cleanStyle,
          companionType: cleanCompanion,
          lotusFootsteps: cleanLotus,
          headwearType: cleanHeadwear,
          meritPoints: initMerit,
          sutrasCompleted: initSutras,
          leavesSwept: initLeaves,
          realmLevel: initRealm,
          isRegistered: false
        };
      } catch (err) {
        console.warn('[DB] getOrCreateUser MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode
    if (this.memUsersByRecovery.has(cleanCodeKey)) {
      const id = this.memUsersByRecovery.get(cleanCodeKey);
      const u = this.memUsers.get(id);
      if (u) {
        let changed = false;
        if (initMerit > Number(u.merit_points || 0)) {
          u.merit_points = initMerit;
          changed = true;
        }
        if (initRealm > Number(u.realm_level || 1)) {
          u.realm_level = initRealm;
          changed = true;
        }
        if (changed) this._saveDiskStore();
        return this._formatTempleUser(u);
      }
    }

    const id = this.memNextUserId++;
    const newUser = {
      id,
      recovery_code: cleanCode,
      dharma_name: cleanName,
      password_hash: null,
      robe_color: cleanColor,
      province_code: cleanProv,
      avatar_style: cleanStyle,
      companion_type: cleanCompanion,
      lotus_footsteps: cleanLotus,
      headwear_type: cleanHeadwear,
      merit_points: initMerit,
      sutras_completed: initSutras,
      leaves_swept: initLeaves,
      realm_level: initRealm
    };
    this.memUsers.set(id, newUser);
    this.memUsersByRecovery.set(cleanCodeKey, id);
    this._saveDiskStore();
    return this._formatTempleUser(newUser);
  }

  async updateUserProfile(
    userId,
    {
      dharmaName,
      robeColor,
      provinceCode,
      avatarStyle,
      companionType,
      lotusFootsteps,
      headwearType,
      meritPoints,
      realmLevel
    }
  ) {
    const cleanName = String(dharmaName || 'Thiện Tâm').trim().slice(0, 50) || 'Thiện Tâm';
    const cleanColor = String(robeColor || '#5c6b73').slice(0, 16);
    const cleanProv = String(provinceCode || 'SG').slice(0, 10);

    if (!this.usingMemory && this.pool) {
      try {
        await this.pool.query(
          `UPDATE users SET dharma_name = ?, robe_color = ?, province_code = ? WHERE id = ?`,
          [cleanName, cleanColor, cleanProv, userId]
        );
      } catch (err) {
        console.warn('[DB] updateUserProfile error:', err.message);
      }
    }

    const memU = this.memUsers.get(Number(userId));
    if (memU) {
      memU.dharma_name = cleanName;
      memU.robe_color = cleanColor;
      memU.province_code = cleanProv;
      if (avatarStyle) memU.avatar_style = String(avatarStyle).slice(0, 32);
      if (companionType) memU.companion_type = String(companionType).slice(0, 24);
      if (lotusFootsteps !== undefined) memU.lotus_footsteps = Boolean(lotusFootsteps);
      if (headwearType) memU.headwear_type = String(headwearType).slice(0, 24);
      if (meritPoints !== undefined) {
        memU.merit_points = Math.max(Number(memU.merit_points || 0), Number(meritPoints || 0));
      }
      if (realmLevel !== undefined) {
        memU.realm_level = Math.max(Number(memU.realm_level || 1), Number(realmLevel || 1));
      }
      this._saveDiskStore();
    }
  }

  /**
   * Đăng ký / Bảo hộ Tài Khoản Phật Tử bằng Pháp Danh + Mật Khẩu (tùy chọn) + Mã Khôi Phục
   */
  async registerAccount({
    recoveryCode,
    dharmaName,
    password = '',
    robeColor = '#5c6b73',
    provinceCode = 'SG',
    avatarStyle = 'AO_LAM',
    companionType = 'NONE',
    lotusFootsteps = true,
    headwearType = 'NONE',
    meritPoints = 0,
    sutrasCompleted = 0,
    leavesSwept = 0,
    realmLevel = 1
  }) {
    const cleanCode = String(recoveryCode || `PHATTU-${Date.now()}`).trim().slice(0, 64);
    const cleanName = String(dharmaName || '').trim().slice(0, 50);
    const cleanPass = String(password || '').trim();
    const cleanColor = String(robeColor || '#5c6b73').slice(0, 16);
    const cleanProv = String(provinceCode || 'SG').slice(0, 10);
    const cleanStyle = String(avatarStyle || 'AO_LAM').slice(0, 32);
    const cleanCompanion = String(companionType || 'NONE').slice(0, 24);
    const cleanLotus = lotusFootsteps !== undefined ? Boolean(lotusFootsteps) : true;
    const cleanHeadwear = String(headwearType || 'NONE').slice(0, 24);
    const incomingMerit = Math.max(0, Number(meritPoints || 0));
    const incomingRealm = Math.max(1, Number(realmLevel || 1));

    if (!cleanName || cleanName.length < 2) {
      return { ok: false, error: 'Pháp danh cần tối thiểu 2 ký tự.' };
    }
    if (cleanPass && cleanPass.length < 4) {
      return { ok: false, error: 'Mật khẩu bảo hộ cần tối thiểu 4 ký tự.' };
    }

    const pwHash = cleanPass ? hashPassword(cleanPass) : null;

    if (!this.usingMemory && this.pool) {
      try {
        const [existingByName] = await this.pool.query(
          `SELECT * FROM users WHERE LOWER(dharma_name) = LOWER(?) AND password_hash IS NOT NULL LIMIT 1`,
          [cleanName]
        );
        if (
          existingByName.length > 0 &&
          String(existingByName[0].recovery_code).toUpperCase() !== cleanCode.toUpperCase()
        ) {
          return { ok: false, error: 'Pháp danh này đã được đạo hữu khác đăng ký mật khẩu bảo hộ!' };
        }

        const user = await this.getOrCreateUser({
          recoveryCode: cleanCode,
          dharmaName: cleanName,
          robeColor: cleanColor,
          provinceCode: cleanProv,
          avatarStyle: cleanStyle,
          companionType: cleanCompanion,
          lotusFootsteps: cleanLotus,
          headwearType: cleanHeadwear,
          meritPoints: incomingMerit,
          sutrasCompleted,
          leavesSwept,
          realmLevel: incomingRealm
        });

        const mergedMerit = Math.max(Number(user.meritPoints || 0), incomingMerit);
        const mergedRealm = Math.max(Number(user.realmLevel || 1), incomingRealm);

        if (pwHash) {
          await this.pool.query(
            `UPDATE users SET dharma_name = ?, password_hash = ?, robe_color = ?, province_code = ?, merit_points = ?, realm_level = ? WHERE id = ?`,
            [cleanName, pwHash, cleanColor, cleanProv, mergedMerit, mergedRealm, user.id]
          );
        } else {
          await this.pool.query(
            `UPDATE users SET dharma_name = ?, robe_color = ?, province_code = ?, merit_points = ?, realm_level = ? WHERE id = ?`,
            [cleanName, cleanColor, cleanProv, mergedMerit, mergedRealm, user.id]
          );
        }

        return {
          ok: true,
          user: {
            ...user,
            dharmaName: cleanName,
            robeColor: cleanColor,
            provinceCode: cleanProv,
            avatarStyle: cleanStyle,
            companionType: cleanCompanion,
            lotusFootsteps: cleanLotus,
            headwearType: cleanHeadwear,
            meritPoints: mergedMerit,
            realmLevel: mergedRealm,
            isRegistered: Boolean(pwHash || user.isRegistered)
          }
        };
      } catch (err) {
        console.warn('[DB] registerAccount MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode check
    for (const u of this.memUsers.values()) {
      if (
        u.password_hash &&
        u.dharma_name.toLowerCase() === cleanName.toLowerCase() &&
        String(u.recovery_code).toUpperCase() !== cleanCode.toUpperCase()
      ) {
        return { ok: false, error: 'Pháp danh này đã được đạo hữu khác đăng ký mật khẩu bảo hộ!' };
      }
    }

    const user = await this.getOrCreateUser({
      recoveryCode: cleanCode,
      dharmaName: cleanName,
      robeColor: cleanColor,
      provinceCode: cleanProv,
      avatarStyle: cleanStyle,
      companionType: cleanCompanion,
      lotusFootsteps: cleanLotus,
      headwearType: cleanHeadwear,
      meritPoints: incomingMerit,
      sutrasCompleted,
      leavesSwept,
      realmLevel: incomingRealm
    });
    const memU = this.memUsers.get(Number(user.id));
    if (memU) {
      memU.dharma_name = cleanName;
      if (pwHash) memU.password_hash = pwHash;
      memU.robe_color = cleanColor;
      memU.province_code = cleanProv;
      memU.avatar_style = cleanStyle;
      memU.companion_type = cleanCompanion;
      memU.lotus_footsteps = cleanLotus;
      memU.headwear_type = cleanHeadwear;
      memU.merit_points = Math.max(Number(memU.merit_points || 0), incomingMerit);
      memU.realm_level = Math.max(Number(memU.realm_level || 1), incomingRealm);
      this._saveDiskStore();
      return {
        ok: true,
        user: this._formatTempleUser(memU)
      };
    }

    return {
      ok: true,
      user: {
        ...user,
        dharmaName: cleanName,
        robeColor: cleanColor,
        provinceCode: cleanProv,
        avatarStyle: cleanStyle,
        companionType: cleanCompanion,
        lotusFootsteps: cleanLotus,
        headwearType: cleanHeadwear,
        isRegistered: Boolean(pwHash || user.isRegistered)
      }
    };
  }

  /**
   * Đăng nhập / Khôi phục Tài Khoản Phật Tử bằng:
   * 1. Mã Pháp Danh Khôi Phục (VD: PHATTU-XXXX-XXXX) - không phân biệt hoa/thường
   * 2. Pháp Danh + Mật Khẩu (hoặc Pháp Danh + Mã Khôi Phục ở ô mật khẩu)
   */
  async loginAccount({ identifier, password = '' }) {
    const cleanId = String(identifier || '').trim();
    const cleanPass = String(password || '').trim();
    if (!cleanId) {
      return { ok: false, error: 'Vui lòng nhập Pháp Danh hoặc Mã Khôi Phục!' };
    }
    const cleanIdUpper = cleanId.toUpperCase();
    const cleanPassUpper = cleanPass.toUpperCase();
    const pwHash = cleanPass ? hashPassword(cleanPass) : null;

    if (!this.usingMemory && this.pool) {
      try {
        // 1. Check by recovery_code first (case-insensitive)
        const [byCode] = await this.pool.query(
          `SELECT * FROM users WHERE UPPER(recovery_code) = UPPER(?) LIMIT 1`,
          [cleanId]
        );
        if (byCode.length > 0) {
          const u = byCode[0];
          return {
            ok: true,
            user: this._formatTempleUser(u)
          };
        }

        // 2. Check by dharma_name + password (or recovery_code in password field)
        const [byName] = await this.pool.query(
          `SELECT * FROM users WHERE LOWER(dharma_name) = LOWER(?) ORDER BY merit_points DESC LIMIT 10`,
          [cleanId]
        );
        if (byName.length === 0) {
          return { ok: false, error: 'Không tìm thấy tài khoản với Pháp Danh hoặc Mã Khôi Phục này!' };
        }
        const matched = byName.find(
          (u) =>
            !u.password_hash ||
            (pwHash && u.password_hash === pwHash) ||
            (cleanPassUpper && String(u.recovery_code || '').toUpperCase() === cleanPassUpper)
        );
        if (!matched) {
          return { ok: false, error: 'Mật khẩu không chính xác! (Hoặc dùng Mã Khôi Phục PHATTU-... để mở khóa)' };
        }
        return {
          ok: true,
          user: this._formatTempleUser(matched)
        };
      } catch (err) {
        console.warn('[DB] loginAccount MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode: 1. Check by recovery_code (case-insensitive)
    let matchedByCode = null;
    if (this.memUsersByRecovery.has(cleanIdUpper)) {
      const id = this.memUsersByRecovery.get(cleanIdUpper);
      matchedByCode = this.memUsers.get(id);
    } else {
      for (const u of this.memUsers.values()) {
        if (String(u.recovery_code || '').toUpperCase() === cleanIdUpper) {
          matchedByCode = u;
          this.memUsersByRecovery.set(cleanIdUpper, u.id);
          break;
        }
      }
    }

    if (matchedByCode) {
      return {
        ok: true,
        user: this._formatTempleUser(matchedByCode)
      };
    }

    // 2. Check by dharma_name
    const candidates = Array.from(this.memUsers.values())
      .filter((u) => String(u.dharma_name || '').toLowerCase() === cleanId.toLowerCase())
      .sort((a, b) => Number(b.merit_points || 0) - Number(a.merit_points || 0));

    if (candidates.length === 0) {
      return { ok: false, error: 'Không tìm thấy tài khoản với Pháp Danh hoặc Mã Khôi Phục này!' };
    }
    const matched = candidates.find(
      (u) =>
        !u.password_hash ||
        (pwHash && u.password_hash === pwHash) ||
        (cleanPassUpper && String(u.recovery_code || '').toUpperCase() === cleanPassUpper)
    );
    if (!matched) {
      return { ok: false, error: 'Mật khẩu không chính xác! (Hoặc dùng Mã Khôi Phục PHATTU-... để mở khóa)' };
    }
    return {
      ok: true,
      user: this._formatTempleUser(matched)
    };
  }

  async createWish({ userId, dharmaName, wishType = 'INCENSE', content, posX = 0, posZ = 34 }) {
    const allowedTypes = new Set(['INCENSE', 'LANTERN', 'SKY_LANTERN', 'CAU_DUYEN']);
    const type = allowedTypes.has(wishType) ? wishType : 'INCENSE';
    const cleanContent = String(content || '').trim().slice(0, 200);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    if (!this.usingMemory && this.pool) {
      try {
        const [res] = await this.pool.query(
          `INSERT INTO wishes_wall (user_id, dharma_name, wish_type, content, pos_x, pos_z, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId || 0, dharmaName || 'Đạo hữu', type, cleanContent, posX, posZ, expiresAt]
        );
        return {
          id: Number(res.insertId),
          user_id: userId,
          dharma_name: dharmaName,
          wish_type: type,
          content: cleanContent,
          pos_x: posX,
          pos_z: posZ,
          expires_at: expiresAt
        };
      } catch (err) {
        console.warn('[DB] createWish error:', err.message);
      }
    }

    const wish = {
      id: this.memNextWishId++,
      user_id: userId || 0,
      dharma_name: dharmaName || 'Đạo hữu',
      wish_type: type,
      content: cleanContent,
      pos_x: posX,
      pos_z: posZ,
      expires_at: expiresAt,
      created_at: new Date()
    };
    this.memWishes.unshift(wish);
    if (this.memWishes.length > 100) this.memWishes.pop();
    this._saveDiskStore();
    return wish;
  }

  async getActiveWishes(limit = 30) {
    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT id, user_id, dharma_name, wish_type, content, pos_x, pos_z, created_at
           FROM wishes_wall
           WHERE expires_at > NOW()
           ORDER BY id DESC
           LIMIT ?`,
          [limit]
        );
        return rows;
      } catch (err) {
        console.warn('[DB] getActiveWishes error:', err.message);
      }
    }
    return this.memWishes.slice(0, limit);
  }

  async getRandomFortune() {
    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT id, rank_title, poem, interpretation FROM daily_fortunes ORDER BY RAND() LIMIT 1`
        );
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('[DB] getRandomFortune error:', err.message);
      }
    }
    return this.memFortunes[Math.floor(Math.random() * this.memFortunes.length)];
  }

  async getLeaderboards() {
    if (!this.usingMemory && this.pool) {
      try {
        const [provinces] = await this.pool.query(
          `SELECT province_code, province_name, total_merit
           FROM province_merits
           ORDER BY total_merit DESC, province_name ASC
           LIMIT 63`
        );
        const [users] = await this.pool.query(
          `SELECT id, dharma_name, province_code, merit_points, sutras_completed, realm_level
           FROM users
           ORDER BY merit_points DESC
           LIMIT 30`
        );
        return { provinces, users };
      } catch (err) {
        console.warn('[DB] getLeaderboards error:', err.message);
      }
    }

    const provinces = Array.from(this.memProvinces.values()).sort(
      (a, b) => b.total_merit - a.total_merit
    );
    const users = Array.from(this.memUsers.values())
      .sort((a, b) => b.merit_points - a.merit_points)
      .slice(0, 30);
    return { provinces, users };
  }

  // ====================================================================
  // NHÀ THỜ CÔNG GIÁO ONLINE 3D - DATABASE METHODS
  // ====================================================================

  _formatChurchUser(u) {
    return {
      id: Number(u.id),
      recoveryCode: u.recovery_code,
      christianName: u.christian_name,
      outfitColor: u.outfit_color || '#f5f0e6',
      avatarStyle: u.avatar_style || 'GIAO_DAN_AO_DAI',
      dioceseCode: u.diocese_code || 'SG',
      gracePoints: Number(u.grace_points || 0),
      rosariesCompleted: Number(u.rosaries_completed || 0),
      gardenTended: Number(u.garden_tended || 0),
      virtueTier: Number(u.virtue_tier || 1),
      isRegistered: Boolean(u.password_hash)
    };
  }

  async getOrCreateChurchUser({
    recoveryCode,
    christianName = 'Tín Hữu Ánh Sáng',
    outfitColor = '#f5f0e6',
    avatarStyle = 'GIAO_DAN_AO_DAI',
    dioceseCode = 'SG',
    gracePoints = 0,
    rosariesCompleted = 0,
    gardenTended = 0,
    virtueTier = 1
  }) {
    const cleanCode = String(recoveryCode || `TINHUU-${Date.now()}-${Math.random()}`).trim().slice(0, 64);
    const cleanCodeKey = cleanCode.toUpperCase();
    const cleanName = String(christianName || 'Tín Hữu Ánh Sáng').trim().slice(0, 50) || 'Tín Hữu Ánh Sáng';
    const cleanColor = String(outfitColor || '#f5f0e6').slice(0, 16);
    const cleanStyle = String(avatarStyle || 'GIAO_DAN_AO_DAI').slice(0, 32);
    const cleanDiocese = String(dioceseCode || 'SG').slice(0, 10);
    const initGrace = Math.max(0, Number(gracePoints || 0));
    const initRosaries = Math.max(0, Number(rosariesCompleted || 0));
    const initGarden = Math.max(0, Number(gardenTended || 0));
    const initTier = Math.max(1, Number(virtueTier || 1));

    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT * FROM nhatho_users WHERE UPPER(recovery_code) = UPPER(?) LIMIT 1`,
          [cleanCode]
        );
        if (rows.length > 0) {
          const u = rows[0];
          const mergedGrace = Math.max(Number(u.grace_points || 0), initGrace);
          const mergedTier = Math.max(Number(u.virtue_tier || 1), initTier);
          if (mergedGrace > Number(u.grace_points || 0) || mergedTier > Number(u.virtue_tier || 1)) {
            await this.pool.query(
              `UPDATE nhatho_users SET grace_points = ?, virtue_tier = ? WHERE id = ?`,
              [mergedGrace, mergedTier, u.id]
            );
            u.grace_points = mergedGrace;
            u.virtue_tier = mergedTier;
          }
          return this._formatChurchUser(u);
        }

        const [res] = await this.pool.query(
          `INSERT INTO nhatho_users (recovery_code, christian_name, outfit_color, avatar_style, diocese_code, grace_points, rosaries_completed, garden_tended, virtue_tier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cleanCode, cleanName, cleanColor, cleanStyle, cleanDiocese, initGrace, initRosaries, initGarden, initTier]
        );
        return {
          id: Number(res.insertId),
          recoveryCode: cleanCode,
          christianName: cleanName,
          outfitColor: cleanColor,
          avatarStyle: cleanStyle,
          dioceseCode: cleanDiocese,
          gracePoints: initGrace,
          rosariesCompleted: initRosaries,
          gardenTended: initGarden,
          virtueTier: initTier,
          isRegistered: false
        };
      } catch (err) {
        console.warn('[DB] getOrCreateChurchUser MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode
    if (this.memChurchUsersByRecovery.has(cleanCodeKey)) {
      const id = this.memChurchUsersByRecovery.get(cleanCodeKey);
      const u = this.memChurchUsers.get(id);
      if (u) {
        let changed = false;
        if (initGrace > Number(u.grace_points || 0)) {
          u.grace_points = initGrace;
          changed = true;
        }
        if (initTier > Number(u.virtue_tier || 1)) {
          u.virtue_tier = initTier;
          changed = true;
        }
        if (changed) this._saveDiskStore();
        return this._formatChurchUser(u);
      }
    }

    const id = this.memNextChurchUserId++;
    const newUser = {
      id,
      recovery_code: cleanCode,
      christian_name: cleanName,
      password_hash: null,
      outfit_color: cleanColor,
      avatar_style: cleanStyle,
      diocese_code: cleanDiocese,
      grace_points: initGrace,
      rosaries_completed: initRosaries,
      garden_tended: initGarden,
      virtue_tier: initTier
    };
    this.memChurchUsers.set(id, newUser);
    this.memChurchUsersByRecovery.set(cleanCodeKey, id);
    this._saveDiskStore();
    return this._formatChurchUser(newUser);
  }

  async updateChurchUserProfile(userId, { christianName, outfitColor, avatarStyle, dioceseCode, gracePoints, virtueTier }) {
    const cleanName = String(christianName || 'Tín Hữu Ánh Sáng').trim().slice(0, 50) || 'Tín Hữu Ánh Sáng';
    const cleanColor = String(outfitColor || '#f5f0e6').slice(0, 16);
    const cleanStyle = String(avatarStyle || 'GIAO_DAN_AO_DAI').slice(0, 32);
    const cleanDiocese = String(dioceseCode || 'SG').slice(0, 10);

    if (!this.usingMemory && this.pool) {
      try {
        await this.pool.query(
          `UPDATE nhatho_users SET christian_name = ?, outfit_color = ?, avatar_style = ?, diocese_code = ? WHERE id = ?`,
          [cleanName, cleanColor, cleanStyle, cleanDiocese, userId]
        );
      } catch (err) {
        console.warn('[DB] updateChurchUserProfile error:', err.message);
      }
    }

    const memU = this.memChurchUsers.get(Number(userId));
    if (memU) {
      memU.christian_name = cleanName;
      memU.outfit_color = cleanColor;
      memU.avatar_style = cleanStyle;
      memU.diocese_code = cleanDiocese;
      if (gracePoints !== undefined) {
        memU.grace_points = Math.max(Number(memU.grace_points || 0), Number(gracePoints || 0));
      }
      if (virtueTier !== undefined) {
        memU.virtue_tier = Math.max(Number(memU.virtue_tier || 1), Number(virtueTier || 1));
      }
      this._saveDiskStore();
    }
  }

  async registerChurchAccount({
    recoveryCode,
    christianName,
    password = '',
    outfitColor = '#f5f0e6',
    avatarStyle = 'GIAO_DAN_AO_DAI',
    dioceseCode = 'SG',
    gracePoints = 0,
    virtueTier = 1
  }) {
    const cleanCode = String(recoveryCode || `TINHUU-${Date.now()}`).trim().slice(0, 64);
    const cleanName = String(christianName || '').trim().slice(0, 50);
    const cleanPass = String(password || '').trim();
    const cleanColor = String(outfitColor || '#f5f0e6').slice(0, 16);
    const cleanStyle = String(avatarStyle || 'GIAO_DAN_AO_DAI').slice(0, 32);
    const cleanDiocese = String(dioceseCode || 'SG').slice(0, 10);
    const incomingGrace = Math.max(0, Number(gracePoints || 0));
    const incomingTier = Math.max(1, Number(virtueTier || 1));

    if (!cleanName || cleanName.length < 2) {
      return { ok: false, error: 'Tên Thánh & Họ Tên cần tối thiểu 2 ký tự.' };
    }
    if (cleanPass && cleanPass.length < 4) {
      return { ok: false, error: 'Mật khẩu bảo hộ cần tối thiểu 4 ký tự.' };
    }

    const pwHash = cleanPass ? hashPassword(cleanPass) : null;

    if (!this.usingMemory && this.pool) {
      try {
        const [existingByName] = await this.pool.query(
          `SELECT * FROM nhatho_users WHERE LOWER(christian_name) = LOWER(?) AND password_hash IS NOT NULL LIMIT 1`,
          [cleanName]
        );
        if (
          existingByName.length > 0 &&
          String(existingByName[0].recovery_code).toUpperCase() !== cleanCode.toUpperCase()
        ) {
          return {
            ok: false,
            error: 'Tên Thánh & Họ Tên này đã được tín hữu khác đăng ký mật khẩu bảo hộ!'
          };
        }

        const user = await this.getOrCreateChurchUser({
          recoveryCode: cleanCode,
          christianName: cleanName,
          outfitColor: cleanColor,
          avatarStyle: cleanStyle,
          dioceseCode: cleanDiocese,
          gracePoints: incomingGrace,
          virtueTier: incomingTier
        });

        const mergedGrace = Math.max(Number(user.gracePoints || 0), incomingGrace);
        const mergedTier = Math.max(Number(user.virtueTier || 1), incomingTier);

        if (pwHash) {
          await this.pool.query(
            `UPDATE nhatho_users SET christian_name = ?, password_hash = ?, outfit_color = ?, avatar_style = ?, diocese_code = ?, grace_points = ?, virtue_tier = ? WHERE id = ?`,
            [cleanName, pwHash, cleanColor, cleanStyle, cleanDiocese, mergedGrace, mergedTier, user.id]
          );
        } else {
          await this.pool.query(
            `UPDATE nhatho_users SET christian_name = ?, outfit_color = ?, avatar_style = ?, diocese_code = ?, grace_points = ?, virtue_tier = ? WHERE id = ?`,
            [cleanName, cleanColor, cleanStyle, cleanDiocese, mergedGrace, mergedTier, user.id]
          );
        }

        return {
          ok: true,
          user: {
            ...user,
            christianName: cleanName,
            outfitColor: cleanColor,
            avatarStyle: cleanStyle,
            dioceseCode: cleanDiocese,
            gracePoints: mergedGrace,
            virtueTier: mergedTier,
            isRegistered: Boolean(pwHash || user.isRegistered)
          }
        };
      } catch (err) {
        console.warn('[DB] registerChurchAccount MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode check
    for (const u of this.memChurchUsers.values()) {
      if (
        u.password_hash &&
        u.christian_name.toLowerCase() === cleanName.toLowerCase() &&
        String(u.recovery_code).toUpperCase() !== cleanCode.toUpperCase()
      ) {
        return {
          ok: false,
          error: 'Tên Thánh & Họ Tên này đã được tín hữu khác đăng ký mật khẩu bảo hộ!'
        };
      }
    }

    const user = await this.getOrCreateChurchUser({
      recoveryCode: cleanCode,
      christianName: cleanName,
      outfitColor: cleanColor,
      avatarStyle: cleanStyle,
      dioceseCode: cleanDiocese,
      gracePoints: incomingGrace,
      virtueTier: incomingTier
    });
    const memU = this.memChurchUsers.get(Number(user.id));
    if (memU) {
      memU.christian_name = cleanName;
      if (pwHash) memU.password_hash = pwHash;
      memU.outfit_color = cleanColor;
      memU.avatar_style = cleanStyle;
      memU.diocese_code = cleanDiocese;
      memU.grace_points = Math.max(Number(memU.grace_points || 0), incomingGrace);
      memU.virtue_tier = Math.max(Number(memU.virtue_tier || 1), incomingTier);
      this._saveDiskStore();
      return {
        ok: true,
        user: this._formatChurchUser(memU)
      };
    }

    return {
      ok: true,
      user: {
        ...user,
        christianName: cleanName,
        outfitColor: cleanColor,
        avatarStyle: cleanStyle,
        dioceseCode: cleanDiocese,
        isRegistered: Boolean(pwHash || user.isRegistered)
      }
    };
  }

  async loginChurchAccount({ identifier, password = '' }) {
    const cleanId = String(identifier || '').trim();
    const cleanPass = String(password || '').trim();
    if (!cleanId) {
      return { ok: false, error: 'Vui lòng nhập Tên Thánh hoặc Mã Khôi Phục!' };
    }
    const cleanIdUpper = cleanId.toUpperCase();
    const cleanPassUpper = cleanPass.toUpperCase();
    const pwHash = cleanPass ? hashPassword(cleanPass) : null;

    if (!this.usingMemory && this.pool) {
      try {
        const [byCode] = await this.pool.query(
          `SELECT * FROM nhatho_users WHERE UPPER(recovery_code) = UPPER(?) LIMIT 1`,
          [cleanId]
        );
        if (byCode.length > 0) {
          return {
            ok: true,
            user: this._formatChurchUser(byCode[0])
          };
        }

        const [byName] = await this.pool.query(
          `SELECT * FROM nhatho_users WHERE LOWER(christian_name) = LOWER(?) ORDER BY grace_points DESC LIMIT 10`,
          [cleanId]
        );
        if (byName.length === 0) {
          return { ok: false, error: 'Không tìm thấy tài khoản với Tên Thánh hoặc Mã Khôi Phục này!' };
        }
        const matched = byName.find(
          (u) =>
            !u.password_hash ||
            (pwHash && u.password_hash === pwHash) ||
            (cleanPassUpper && String(u.recovery_code || '').toUpperCase() === cleanPassUpper)
        );
        if (!matched) {
          return { ok: false, error: 'Mật khẩu không chính xác! (Hoặc dùng Mã Khôi Phục TINHUU-... để mở khóa)' };
        }
        return {
          ok: true,
          user: this._formatChurchUser(matched)
        };
      } catch (err) {
        console.warn('[DB] loginChurchAccount MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode
    let matchedByCode = null;
    if (this.memChurchUsersByRecovery.has(cleanIdUpper)) {
      const id = this.memChurchUsersByRecovery.get(cleanIdUpper);
      matchedByCode = this.memChurchUsers.get(id);
    } else {
      for (const u of this.memChurchUsers.values()) {
        if (String(u.recovery_code || '').toUpperCase() === cleanIdUpper) {
          matchedByCode = u;
          this.memChurchUsersByRecovery.set(cleanIdUpper, u.id);
          break;
        }
      }
    }

    if (matchedByCode) {
      return {
        ok: true,
        user: this._formatChurchUser(matchedByCode)
      };
    }

    const candidates = Array.from(this.memChurchUsers.values())
      .filter((u) => String(u.christian_name || '').toLowerCase() === cleanId.toLowerCase())
      .sort((a, b) => Number(b.grace_points || 0) - Number(a.grace_points || 0));

    if (candidates.length === 0) {
      return { ok: false, error: 'Không tìm thấy tài khoản với Tên Thánh hoặc Mã Khôi Phục này!' };
    }
    const matched = candidates.find(
      (u) =>
        !u.password_hash ||
        (pwHash && u.password_hash === pwHash) ||
        (cleanPassUpper && String(u.recovery_code || '').toUpperCase() === cleanPassUpper)
    );
    if (!matched) {
      return { ok: false, error: 'Mật khẩu không chính xác! (Hoặc dùng Mã Khôi Phục TINHUU-... để mở khóa)' };
    }
    return {
      ok: true,
      user: this._formatChurchUser(matched)
    };
  }

  async createIntention({
    userId,
    christianName,
    intentionType = 'CANDLE',
    content,
    posX = 0,
    posZ = 24
  }) {
    const type = intentionType === 'ROSE' ? 'ROSE' : 'CANDLE';
    const cleanContent = String(content || '').trim().slice(0, 200);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    if (!this.usingMemory && this.pool) {
      try {
        const [res] = await this.pool.query(
          `INSERT INTO prayer_intentions (user_id, christian_name, intention_type, content, pos_x, pos_z, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId || 0, christianName || 'Tín hữu', type, cleanContent, posX, posZ, expiresAt]
        );
        return {
          id: Number(res.insertId),
          user_id: userId,
          christian_name: christianName,
          intention_type: type,
          content: cleanContent,
          pos_x: posX,
          pos_z: posZ,
          expires_at: expiresAt
        };
      } catch (err) {
        console.warn('[DB] createIntention error:', err.message);
      }
    }

    const intention = {
      id: this.memNextIntentionId++,
      user_id: userId || 0,
      christian_name: christianName || 'Tín hữu',
      intention_type: type,
      content: cleanContent,
      pos_x: posX,
      pos_z: posZ,
      expires_at: expiresAt,
      created_at: new Date()
    };
    this.memIntentions.unshift(intention);
    if (this.memIntentions.length > 100) this.memIntentions.pop();
    this._saveDiskStore();
    return intention;
  }

  async getActiveIntentions(limit = 30) {
    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT id, user_id, christian_name, intention_type, content, pos_x, pos_z, created_at
           FROM prayer_intentions
           WHERE expires_at > NOW()
           ORDER BY id DESC
           LIMIT ?`,
          [limit]
        );
        return rows;
      } catch (err) {
        console.warn('[DB] getActiveIntentions error:', err.message);
      }
    }
    return this.memIntentions.slice(0, limit);
  }

  async getRandomScripture() {
    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT id, theme_title, bible_verse, reference_book, reflection FROM daily_scriptures ORDER BY RAND() LIMIT 1`
        );
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('[DB] getRandomScripture error:', err.message);
      }
    }
    return this.memScriptures[Math.floor(Math.random() * this.memScriptures.length)];
  }

  async getChurchLeaderboards() {
    if (!this.usingMemory && this.pool) {
      try {
        const [dioceses] = await this.pool.query(
          `SELECT diocese_code, diocese_name, ecclesiastical_province, total_grace
           FROM diocese_bouquets
           ORDER BY total_grace DESC, diocese_name ASC
           LIMIT 27`
        );
        const [users] = await this.pool.query(
          `SELECT id, christian_name, diocese_code, grace_points, rosaries_completed, virtue_tier
           FROM nhatho_users
           ORDER BY grace_points DESC
           LIMIT 30`
        );
        return { dioceses, users };
      } catch (err) {
        console.warn('[DB] getChurchLeaderboards error:', err.message);
      }
    }

    const dioceses = Array.from(this.memDioceses.values()).sort(
      (a, b) => b.total_grace - a.total_grace
    );
    const users = Array.from(this.memChurchUsers.values())
      .sort((a, b) => b.grace_points - a.grace_points)
      .slice(0, 30);
    return { dioceses, users };
  }

  async saveChatMessage(chatPayload = {}) {
    const entry = {
      id: String(chatPayload.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      socketId: chatPayload.socketId || '',
      userId: chatPayload.userId ?? 0,
      dharmaName: String(chatPayload.dharmaName || 'Đạo Hữu').slice(0, 50),
      provinceCode: String(chatPayload.provinceCode || 'SG').slice(0, 10),
      roomId: String(chatPayload.roomId || 'chanh-dien-1').slice(0, 32),
      text: String(chatPayload.text || '').trim().slice(0, 180),
      flagged: Boolean(chatPayload.flagged),
      timestamp: Number(chatPayload.timestamp || Date.now())
    };
    if (!entry.text) return null;

    // Always append to memory + disk cache so history is available immediately and survives restarts
    this.memChatMessages.push(entry);
    if (this.memChatMessages.length > 200) {
      this.memChatMessages = this.memChatMessages.slice(-200);
    }
    this._saveDiskChatHistory();

    if (!this.usingMemory && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO chat_messages (msg_id, room_id, user_id, dharma_name, province_code, content, flagged, created_at_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id,
            entry.roomId,
            String(entry.userId),
            entry.dharmaName,
            entry.provinceCode,
            entry.text,
            entry.flagged ? 1 : 0,
            entry.timestamp
          ]
        );
      } catch (err) {
        console.warn('[DB] saveChatMessage MySQL warning:', err.message);
      }
    }

    return entry;
  }

  async getRecentChatMessages(roomId = 'chanh-dien-1', limit = 40) {
    const cleanRoom = String(roomId || 'chanh-dien-1').slice(0, 32);
    const maxItems = Math.min(100, Math.max(5, Number(limit || 40)));

    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT msg_id, room_id, user_id, dharma_name, province_code, content, flagged, created_at_ms
           FROM chat_messages
           WHERE room_id = ?
           ORDER BY id DESC
           LIMIT ?`,
          [cleanRoom, maxItems]
        );
        if (rows.length > 0) {
          return rows.reverse().map((r) => ({
            id: r.msg_id,
            roomId: r.room_id,
            userId: r.user_id,
            dharmaName: r.dharma_name,
            provinceCode: r.province_code,
            text: r.content,
            flagged: Boolean(r.flagged),
            timestamp: Number(r.created_at_ms || Date.now())
          }));
        }
      } catch (err) {
        console.warn('[DB] getRecentChatMessages MySQL warning:', err.message);
      }
    }

    const filtered = this.memChatMessages.filter(
      (m) => !m.roomId || m.roomId === cleanRoom || cleanRoom === 'all'
    );
    return filtered.slice(-maxItems);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const db = new DatabaseManager();
