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

export class DatabaseManager {
  constructor() {
    this.pool = null;
    this.usingMemory = false;

    // In-memory fallback stores
    this.memUsers = new Map(); // id -> user
    this.memUsersByRecovery = new Map(); // recovery_code -> id
    this.memNextUserId = 1;
    this.memWishes = [];
    this.memNextWishId = 1;
    this.memProvinces = new Map();
    this.memFortunes = [...DEFAULT_FORTUNES];
    this.memSutras = [...DEFAULT_SUTRAS];
    this.memChatMessages = []; // Bounded up to 200 recent messages across rooms
    this.chatDiskPath = path.resolve(__dirname, '../data/persistent_chat_history.json');

    this._initMemoryDefaults();
    this._loadDiskChatHistory();
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
  }

  forceMemoryMode() {
    this.usingMemory = true;
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
        wish_type ENUM('INCENSE', 'LANTERN') NOT NULL,
        content VARCHAR(200) NOT NULL,
        pos_x FLOAT DEFAULT 0,
        pos_z FLOAT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active_wishes (wish_type, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
  }

  /**
   * Pool-compatible getConnection() for MeritBatcher transaction batching
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
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('UPDATE USERS SET MERIT_POINTS')) {
      // Handle MeritBatcher UPDATE users SET merit_points = merit_points + ? ... WHERE id = ?
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
      }
      return [{ affectedRows: u ? 1 : 0 }];
    }
    if (normalized.startsWith('UPDATE PROVINCE_MERITS SET TOTAL_MERIT')) {
      const delta = Number(params[0] || 0);
      const code = String(params[1] || 'SG');
      const p = this.memProvinces.get(code);
      if (p) p.total_merit += delta;
      return [{ affectedRows: p ? 1 : 0 }];
    }
    return [[]];
  }

  async getOrCreateUser({ recoveryCode, dharmaName = 'Thiện Tâm', robeColor = '#5c6b73', provinceCode = 'SG' }) {
    const cleanCode = String(recoveryCode || `GUEST-${Date.now()}-${Math.random()}`).slice(0, 64);
    const cleanName = String(dharmaName || 'Thiện Tâm').slice(0, 50);
    const cleanColor = String(robeColor || '#5c6b73').slice(0, 16);
    const cleanProv = String(provinceCode || 'SG').slice(0, 10);

    if (!this.usingMemory && this.pool) {
      try {
        const [rows] = await this.pool.query(
          `SELECT * FROM users WHERE recovery_code = ? LIMIT 1`,
          [cleanCode]
        );
        if (rows.length > 0) {
          const u = rows[0];
          return {
            id: Number(u.id),
            recoveryCode: u.recovery_code,
            dharmaName: u.dharma_name,
            robeColor: u.robe_color,
            provinceCode: u.province_code,
            meritPoints: Number(u.merit_points || 0),
            sutrasCompleted: Number(u.sutras_completed || 0),
            leavesSwept: Number(u.leaves_swept || 0),
            realmLevel: Number(u.realm_level || 1)
          };
        }

        const [res] = await this.pool.query(
          `INSERT INTO users (recovery_code, dharma_name, robe_color, province_code, merit_points, sutras_completed, realm_level)
           VALUES (?, ?, ?, ?, 0, 0, 1)`,
          [cleanCode, cleanName, cleanColor, cleanProv]
        );
        return {
          id: Number(res.insertId),
          recoveryCode: cleanCode,
          dharmaName: cleanName,
          robeColor: cleanColor,
          provinceCode: cleanProv,
          meritPoints: 0,
          sutrasCompleted: 0,
          leavesSwept: 0,
          realmLevel: 1
        };
      } catch (err) {
        console.warn('[DB] getOrCreateUser MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode
    if (this.memUsersByRecovery.has(cleanCode)) {
      const id = this.memUsersByRecovery.get(cleanCode);
      const u = this.memUsers.get(id);
      return {
        id: u.id,
        recoveryCode: u.recovery_code,
        dharmaName: u.dharma_name,
        robeColor: u.robe_color,
        provinceCode: u.province_code,
        meritPoints: u.merit_points,
        sutrasCompleted: u.sutras_completed,
        leavesSwept: u.leaves_swept,
        realmLevel: u.realm_level
      };
    }

    const id = this.memNextUserId++;
    const newUser = {
      id,
      recovery_code: cleanCode,
      dharma_name: cleanName,
      robe_color: cleanColor,
      province_code: cleanProv,
      merit_points: 0,
      sutras_completed: 0,
      leaves_swept: 0,
      realm_level: 1
    };
    this.memUsers.set(id, newUser);
    this.memUsersByRecovery.set(cleanCode, id);
    return {
      id,
      recoveryCode: cleanCode,
      dharmaName: cleanName,
      robeColor: cleanColor,
      provinceCode: cleanProv,
      meritPoints: 0,
      sutrasCompleted: 0,
      leavesSwept: 0,
      realmLevel: 1
    };
  }

  async updateUserProfile(userId, { dharmaName, robeColor, provinceCode }) {
    const cleanName = String(dharmaName || 'Thiện Tâm').slice(0, 50);
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
    }
  }

  /**
   * Đăng ký / Bảo hộ Tài Khoản Phật Tử bằng Pháp Danh + Mật Khẩu + Mã Khôi Phục
   */
  async registerAccount({ recoveryCode, dharmaName, password, robeColor = '#5c6b73', provinceCode = 'SG' }) {
    const cleanCode = String(recoveryCode || `PHATTU-${Date.now()}`).trim().slice(0, 64);
    const cleanName = String(dharmaName || '').trim().slice(0, 50);
    const cleanPass = String(password || '').trim();
    const cleanColor = String(robeColor || '#5c6b73').slice(0, 16);
    const cleanProv = String(provinceCode || 'SG').slice(0, 10);

    if (!cleanName || cleanName.length < 2) {
      return { ok: false, error: 'Pháp danh cần tối thiểu 2 ký tự.' };
    }
    if (!cleanPass || cleanPass.length < 4) {
      return { ok: false, error: 'Mật khẩu bảo hộ cần tối thiểu 4 ký tự.' };
    }

    const pwHash = hashPassword(cleanPass);

    if (!this.usingMemory && this.pool) {
      try {
        const [existingByName] = await this.pool.query(
          `SELECT * FROM users WHERE LOWER(dharma_name) = LOWER(?) AND password_hash IS NOT NULL LIMIT 1`,
          [cleanName]
        );
        if (existingByName.length > 0 && existingByName[0].recovery_code !== cleanCode) {
          return { ok: false, error: 'Pháp danh này đã được đạo hữu khác đăng ký mật khẩu bảo hộ!' };
        }

        const user = await this.getOrCreateUser({
          recoveryCode: cleanCode,
          dharmaName: cleanName,
          robeColor: cleanColor,
          provinceCode: cleanProv
        });

        await this.pool.query(
          `UPDATE users SET dharma_name = ?, password_hash = ?, robe_color = ?, province_code = ? WHERE id = ?`,
          [cleanName, pwHash, cleanColor, cleanProv, user.id]
        );

        return {
          ok: true,
          user: {
            ...user,
            dharmaName: cleanName,
            robeColor: cleanColor,
            provinceCode: cleanProv,
            isRegistered: true
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
        u.recovery_code !== cleanCode
      ) {
        return { ok: false, error: 'Pháp danh này đã được đạo hữu khác đăng ký mật khẩu bảo hộ!' };
      }
    }

    const user = await this.getOrCreateUser({
      recoveryCode: cleanCode,
      dharmaName: cleanName,
      robeColor: cleanColor,
      provinceCode: cleanProv
    });
    const memU = this.memUsers.get(Number(user.id));
    if (memU) {
      memU.dharma_name = cleanName;
      memU.password_hash = pwHash;
      memU.robe_color = cleanColor;
      memU.province_code = cleanProv;
    }

    return {
      ok: true,
      user: {
        ...user,
        dharmaName: cleanName,
        robeColor: cleanColor,
        provinceCode: cleanProv,
        isRegistered: true
      }
    };
  }

  /**
   * Đăng nhập / Khôi phục Tài Khoản Phật Tử bằng:
   * 1. Pháp Danh + Mật Khẩu
   * 2. Mã Pháp Danh Khôi Phục (VD: PHATTU-XXXX-XXXX)
   */
  async loginAccount({ identifier, password = '' }) {
    const cleanId = String(identifier || '').trim();
    const cleanPass = String(password || '').trim();
    if (!cleanId) {
      return { ok: false, error: 'Vui lòng nhập Pháp Danh hoặc Mã Khôi Phục!' };
    }
    const pwHash = cleanPass ? hashPassword(cleanPass) : null;

    if (!this.usingMemory && this.pool) {
      try {
        // 1. Check by recovery_code first
        const [byCode] = await this.pool.query(
          `SELECT * FROM users WHERE recovery_code = ? LIMIT 1`,
          [cleanId]
        );
        if (byCode.length > 0) {
          const u = byCode[0];
          if (u.password_hash && pwHash && u.password_hash !== pwHash) {
            return { ok: false, error: 'Mật khẩu không chính xác!' };
          }
          return {
            ok: true,
            user: {
              id: Number(u.id),
              recoveryCode: u.recovery_code,
              dharmaName: u.dharma_name,
              robeColor: u.robe_color,
              provinceCode: u.province_code,
              meritPoints: Number(u.merit_points || 0),
              sutrasCompleted: Number(u.sutras_completed || 0),
              leavesSwept: Number(u.leaves_swept || 0),
              realmLevel: Number(u.realm_level || 1),
              isRegistered: Boolean(u.password_hash)
            }
          };
        }

        // 2. Check by dharma_name + password
        const [byName] = await this.pool.query(
          `SELECT * FROM users WHERE LOWER(dharma_name) = LOWER(?) ORDER BY merit_points DESC LIMIT 5`,
          [cleanId]
        );
        if (byName.length === 0) {
          return { ok: false, error: 'Không tìm thấy tài khoản với Pháp Danh hoặc Mã Khôi Phục này!' };
        }
        const matched = byName.find((u) => !u.password_hash || (pwHash && u.password_hash === pwHash));
        if (!matched) {
          return { ok: false, error: 'Mật khẩu không chính xác!' };
        }
        return {
          ok: true,
          user: {
            id: Number(matched.id),
            recoveryCode: matched.recovery_code,
            dharmaName: matched.dharma_name,
            robeColor: matched.robe_color,
            provinceCode: matched.province_code,
            meritPoints: Number(matched.merit_points || 0),
            sutrasCompleted: Number(matched.sutras_completed || 0),
            leavesSwept: Number(matched.leaves_swept || 0),
            realmLevel: Number(matched.realm_level || 1),
            isRegistered: Boolean(matched.password_hash)
          }
        };
      } catch (err) {
        console.warn('[DB] loginAccount MySQL error, falling back to memory:', err.message);
        this.usingMemory = true;
      }
    }

    // Memory mode
    if (this.memUsersByRecovery.has(cleanId)) {
      const id = this.memUsersByRecovery.get(cleanId);
      const u = this.memUsers.get(id);
      if (u.password_hash && pwHash && u.password_hash !== pwHash) {
        return { ok: false, error: 'Mật khẩu không chính xác!' };
      }
      return {
        ok: true,
        user: {
          id: u.id,
          recoveryCode: u.recovery_code,
          dharmaName: u.dharma_name,
          robeColor: u.robe_color,
          provinceCode: u.province_code,
          meritPoints: u.merit_points,
          sutrasCompleted: u.sutras_completed,
          leavesSwept: u.leaves_swept,
          realmLevel: u.realm_level,
          isRegistered: Boolean(u.password_hash)
        }
      };
    }

    const candidates = Array.from(this.memUsers.values()).filter(
      (u) => u.dharma_name.toLowerCase() === cleanId.toLowerCase()
    );
    if (candidates.length === 0) {
      return { ok: false, error: 'Không tìm thấy tài khoản với Pháp Danh hoặc Mã Khôi Phục này!' };
    }
    const matched = candidates.find((u) => !u.password_hash || (pwHash && u.password_hash === pwHash));
    if (!matched) {
      return { ok: false, error: 'Mật khẩu không chính xác!' };
    }
    return {
      ok: true,
      user: {
        id: matched.id,
        recoveryCode: matched.recovery_code,
        dharmaName: matched.dharma_name,
        robeColor: matched.robe_color,
        provinceCode: matched.province_code,
        meritPoints: matched.merit_points,
        sutrasCompleted: matched.sutras_completed,
        leavesSwept: matched.leaves_swept,
        realmLevel: matched.realm_level,
        isRegistered: Boolean(matched.password_hash)
      }
    };
  }

  async createWish({ userId, dharmaName, wishType = 'INCENSE', content, posX = 0, posZ = 34 }) {
    const type = wishType === 'LANTERN' ? 'LANTERN' : 'INCENSE';
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
