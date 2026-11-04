/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Kho Kinh Nguyện Phụng Vụ, Cấp Bậc Hoa Thiêng & Dữ Liệu Giáo Phận
 */

export const PRAYER_LIBRARY = [
  {
    id: 'chuoi-man-coi-mua-vui',
    title: 'Chuỗi Mân Côi - Năm Sự Vui',
    subtitle: 'Suy niệm mầu nhiệm Nhập Thể của Con Thiên Chúa cùng Đức Trinh Nữ Maria',
    category: 'Kinh Mân Côi',
    durationSec: 210,
    gracePerVerse: 3,
    completionBonus: 40,
    organChordHz: [261.63, 329.63, 392.00], // Hợp âm Đô Trưởng (C Major) ấm áp
    beadTempoMs: 900,
    description: 'Suy niệm 5 mầu nhiệm Năm Sự Vui cùng Đức Trinh Nữ Maria, cầu xin ơn khiêm nhường và lòng mến tha nhân.',
    verses: [
      { text: 'Nhân danh Cha và Con và Thánh Thần. Amen.', chime: true },
      { text: 'Lạy Chúa Giêsu, xin tha tội cho chúng con, xin cứu chúng con khỏi sa hỏa ngục, xin đem các linh hồn lên Thiên Đàng, nhất là những linh hồn cần đến lòng Chúa thương xót hơn.', chime: true },
      { text: 'Thứ nhất thì ngắm: Thiên thần truyền tin cho Đức Bà chịu thai. Ta hãy xin cho được ở khiêm nhường.', chime: true },
      { text: 'Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng, nước Cha trị đến, ý Cha thể hiện dưới đất cũng như trên trời.', chime: false },
      { text: 'Xin Cha cho chúng con hôm nay lương thực hằng ngày, và tha nợ chúng con như chúng con cũng tha kẻ có nợ chúng con.', chime: false },
      { text: 'Xin chớ để chúng con sa chước cám dỗ, nhưng cứu chúng con cho khỏi sự dữ. Amen.', chime: true },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.', chime: false },
      { text: 'Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi này và trong giờ lâm tử. Amen. (3 lần)', chime: true },
      { text: 'Thứ hai thì ngắm: Đức Bà đi viếng Bà Thánh Isave. Ta hãy xin cho được lòng yêu người.', chime: true },
      { text: 'Thứ ba thì ngắm: Đức Bà sinh Đức Chúa Giêsu nơi hang đá Bêlem. Ta hãy xin cho được lòng khó khăn.', chime: false },
      { text: 'Thứ bốn thì ngắm: Đức Bà dâng Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được vâng lời chịu lụy.', chime: false },
      { text: 'Thứ năm thì ngắm: Đức Bà tìm được Đức Chúa Giêsu trong Đền Thánh. Ta hãy xin cho được giữ nghĩa cùng Chúa luôn.', chime: true },
      { text: 'Sáng danh Đức Chúa Cha, và Đức Chúa Con, và Đức Chúa Thánh Thần. Như đã có trước vô cùng và bây giờ và hằng có và đời đời chẳng cùng. Amen.', chime: true }
    ]
  },
  {
    id: 'kinh-truyen-tin-angelus',
    title: 'Kinh Truyền Tin (Angelus)',
    subtitle: 'Tiếng chuông giáo đường ngân vang suy niệm Ngôi Hai xuống thế làm người',
    category: 'Phụng Vụ Giờ Kinh',
    durationSec: 150,
    gracePerVerse: 3,
    completionBonus: 30,
    organChordHz: [293.66, 369.99, 440.00], // Hợp âm Rê Trưởng (D Major) sáng trong
    beadTempoMs: 850,
    description: 'Kinh Truyền Tin cầu nguyện ba buổi sáng - trưa - chiều theo tiếng chuông tháp giáo đường.',
    verses: [
      { text: 'Đức Chúa Trời sai Thánh Thiên Thần truyền tin cho Rất Thánh Đức Bà Maria. Và Rất Thánh Đức Bà chịu thai bởi phép Đức Chúa Thánh Thần.', chime: true },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.', chime: false },
      { text: 'Này tôi là tôi tá Đức Chúa Trời. Tôi xin vâng như lời Thánh Thiên Thần truyền.', chime: true },
      { text: 'Chốc ấy Ngôi Thứ Hai xuống thế làm người. Và ở cùng chúng con.', chime: true },
      { text: 'Lạy Rất Thánh Đức Mẹ Chúa Trời, xin cầu cho chúng con. Đáng chịu lấy những sự Chúa Kitô đã hứa.', chime: false },
      { text: 'Chúng con xin Chúa ban ơn xuống trong linh hồn chúng con là kẻ đã nhờ lời Thánh Thiên Thần truyền mà biết thật Chúa Kitô là Con Chúa đã xuống thế làm người.', chime: false },
      { text: 'Thì xin vì công ơn Chúa chịu nạn chịu chết trên cây Thánh Giá, cho chúng con ngày sau khi sống lại được đến nơi vinh hiển, cũng vì công nghiệp Chúa Kitô là Chúa chúng con. Amen.', chime: true }
    ]
  },
  {
    id: 'kinh-hoa-binh-thanh-phanxico',
    title: 'Kinh Hòa Bình (Thánh Phanxicô Assisi)',
    subtitle: 'Đem yêu thương vào nơi oán thù, đem an hòa vào nơi tranh chấp',
    category: 'Tâm Tình Cầu Nguyện',
    durationSec: 140,
    gracePerVerse: 3,
    completionBonus: 30,
    organChordHz: [349.23, 440.00, 523.25], // Hợp âm Pha Trưởng (F Major) dịu hiền
    beadTempoMs: 920,
    description: 'Lời cầu nguyện bất hủ của Thánh Phanxicô Assisi xin làm khí cụ bình an của Chúa giữa trần gian.',
    verses: [
      { text: 'Lạy Chúa từ nhân, xin cho con biết mến yêu và phụng sự Chúa trong mọi người.', chime: true },
      { text: 'Lạy Chúa, xin hãy dùng con như khí cụ bình an của Chúa: Đem yêu thương vào nơi oán thù, đem thứ tha vào nơi lăng nhục.', chime: false },
      { text: 'Đem an hòa vào nơi tranh chấp, đem chân lý vào chốn lỗi lầm.', chime: false },
      { text: 'Đem tin kính vào nơi nghi nan, chiếu trông cậy vào nơi thất vọng.', chime: true },
      { text: 'Để con dọi ánh sáng vào nơi tối tăm, đem niềm vui đến chốn u sầu.', chime: false },
      { text: 'Lạy Chúa, xin hãy dạy con: Tìm an ủi người hơn được người ủi an, tìm hiểu biết người hơn được người hiểu biết, tìm yêu mến người hơn được người mến yêu.', chime: true },
      { text: 'Vì chính khi hiến thân là khi được nhận lãnh, chính lúc quên mình là lúc gặp lại bản thân.', chime: false },
      { text: 'Vì chính khi thứ tha là khi được tha thứ, chính lúc chết đi là khi vui sống muôn đời. Amen.', chime: true }
    ]
  },
  {
    id: 'chuoi-long-chua-thuong-xot',
    title: 'Chuỗi Lòng Chúa Thương Xót',
    subtitle: 'Cầu xin Lòng Thương Xót vô biên của Chúa Giêsu đổ tràn trên toàn thế giới',
    category: 'Lòng Chúa Thương Xót',
    durationSec: 160,
    gracePerVerse: 3,
    completionBonus: 35,
    organChordHz: [220.00, 261.63, 329.63], // Hợp âm La Thứ (A Minor) sâu lắng thống hối
    beadTempoMs: 880,
    description: 'Tín thác trọn vẹn nơi Lòng Chúa Thương Xót, cầu cho các linh hồn và hòa bình thế giới.',
    verses: [
      { text: 'Lạy Chúa Giêsu, Chúa đã trút hơi thở cuối cùng trên Thánh Giá, thì suối nguồn sự sống đã tuôn trào cho các linh hồn, và đại dương Lòng Chúa Thương Xót đã mở ra cho toàn thế giới.', chime: true },
      { text: 'Ôi Suối Nguồn Sự Sống, Lòng Thương Xót khôn dò của Thiên Chúa, xin bao bọc toàn thế giới và trút hết tình thương của Chúa xuống trên chúng con.', chime: false },
      { text: 'Lạy Cha Hằng Hữu, con xin dâng lên Cha Mình và Máu, Linh Hồn và Thần Tính của Con rất yêu dấu Cha là Đức Giêsu Kitô, Chúa chúng con.', chime: true },
      { text: 'Để đền vì tội lỗi chúng con và toàn thế giới.', chime: false },
      { text: 'Vì cuộc Khổ Nạn đau thương của Chúa Giêsu Kitô, xin Cha thương xót chúng con và toàn thế giới. (3 lần)', chime: true },
      { text: 'Lạy Đáng Chí Thánh, là Thiên Chúa Toàn Năng Hằng Hữu, xin thương xót chúng con và toàn thế giới. (3 lần)', chime: true },
      { text: 'Lạy Chúa Giêsu, con tín thác vào Chúa! Amen.', chime: true }
    ]
  },
  {
    id: 'kinh-toi-gia-dinh',
    title: 'Kinh Tối Gia Đình & Kinh Trông Cậy',
    subtitle: 'Phó dâng gia đình, ông bà cha mẹ trong tay Chúa và Mẹ Maria trước giờ nghỉ đêm',
    category: 'Cầu An Gia Đình',
    durationSec: 130,
    gracePerVerse: 3,
    completionBonus: 25,
    organChordHz: [196.00, 246.94, 293.66], // Hợp âm Sol Trưởng (G Major) bình yên
    beadTempoMs: 900,
    description: 'Lời kinh tối ấm áp phó thác gia đình dưới sự che chở của Chúa và Mẹ Maria.',
    verses: [
      { text: 'Lạy Chúa, chúng con cảm tạ Chúa vì muôn ơn lành Chúa đã gìn giữ gia đình chúng con suốt ngày sống hôm nay.', chime: true },
      { text: 'Chúng con trông cậy Rất Thánh Đức Mẹ Chúa Trời, xin chớ chê chớ bỏ lời chúng con nguyện trong cơn gian nan thiếu thốn, Đức Nữ Đồng Trinh hiển vinh sáng láng.', chime: false },
      { text: 'Hằng chữa chúng con cho khỏi mọi sự dữ. Amen.', chime: true },
      { text: 'Lạy Rất Thánh Trái Tim Đức Chúa Giêsu, thương xót chúng con.', chime: false },
      { text: 'Lạy Trái Tim Cực Thanh Cực Tịnh Rất Thánh Đức Bà Maria, cầu cho chúng con.', chime: false },
      { text: 'Lạy Ông Thánh Giuse là bạn thanh sạch Đức Bà Maria trọn đời đồng trinh, cầu cho chúng con.', chime: true },
      { text: 'Xin Chúa ban cho gia đình chúng con một đêm an lành và một giấc ngủ bình yên. Amen.', chime: true }
    ]
  },
  {
    id: 'chuoi-man-coi-mua-thuong',
    title: 'Chuỗi Mân Côi - Năm Sự Thương',
    subtitle: 'Suy niệm cuộc Khổ Nạn cứu độ của Chúa Giêsu Kitô trên đồi Canvê',
    category: 'Kinh Mân Côi',
    durationSec: 190,
    gracePerVerse: 3,
    completionBonus: 40,
    organChordHz: [220.00, 261.63, 329.63], // Hợp âm La Thứ (A Minor) trang nghiêm
    beadTempoMs: 900,
    description: 'Suy niệm 5 mầu nhiệm Năm Sự Thương, ăn năn đền tội và cảm tạ ơn cứu chuộc của Chúa Giêsu.',
    verses: [
      { text: 'Nhân danh Cha và Con và Thánh Thần. Amen.', chime: true },
      { text: 'Thứ nhất thì ngắm: Đức Chúa Giêsu lo buồn đổ mồ hôi máu trong vườn Cây Dầu. Ta hãy xin cho được ăn năn tội nên.', chime: true },
      { text: 'Thứ hai thì ngắm: Đức Chúa Giêsu chịu đánh đòn. Ta hãy xin cho được hãm mình chịu khó bằng lòng.', chime: false },
      { text: 'Thứ ba thì ngắm: Đức Chúa Giêsu chịu đội mão gai. Ta hãy xin cho được chịu mọi sự sỉ nhục bằng lòng.', chime: false },
      { text: 'Thứ bốn thì ngắm: Đức Chúa Giêsu vác cây Thánh Giá. Ta hãy xin cho được vác Thánh Giá theo chân Chúa.', chime: true },
      { text: 'Thứ năm thì ngắm: Đức Chúa Giêsu chịu đóng đanh trên cây Thánh Giá và chịu chết. Ta hãy xin cho được đóng đanh tính xác thịt vào Thánh Giá Chúa.', chime: true },
      { text: 'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.', chime: false },
      { text: 'Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội khi này và trong giờ lâm tử. Amen. (3 lần)', chime: true },
      { text: 'Lạy Chúa Giêsu, xin tha tội cho chúng con, xin cứu chúng con khỏi sa hỏa ngục, xin đem các linh hồn lên Thiên Đàng, nhất là những linh hồn cần đến lòng Chúa thương xót hơn. Amen.', chime: true }
    ]
  },
  {
    id: 'chuoi-man-coi-mua-mung',
    title: 'Chuỗi Mân Côi - Năm Sự Mừng',
    subtitle: 'Hân hoan chiêm ngắm Chúa Giêsu Phục Sinh vinh hiển và Mẹ Maria Nữ Vương Thiên Đàng',
    category: 'Kinh Mân Côi',
    durationSec: 190,
    gracePerVerse: 3,
    completionBonus: 40,
    organChordHz: [261.63, 329.63, 392.00], // Hợp âm Đô Trưởng (C Major) khải hoàn
    beadTempoMs: 880,
    description: 'Suy niệm 5 mầu nhiệm Năm Sự Mừng, củng cố đức tin, lòng cậy trông và niềm hy vọng Nước Trời.',
    verses: [
      { text: 'Nhân danh Cha và Con và Thánh Thần. Amen.', chime: true },
      { text: 'Thứ nhất thì ngắm: Đức Chúa Giêsu sống lại vinh hiển. Ta hãy xin cho được sống lại thật về phần linh hồn.', chime: true },
      { text: 'Thứ hai thì ngắm: Đức Chúa Giêsu lên trời. Ta hãy xin cho được ái mộ những sự trên trời.', chime: false },
      { text: 'Thứ ba thì ngắm: Đức Chúa Thánh Thần hiện xuống. Ta hãy xin cho được lòng đầy dẫy mọi ơn Đức Chúa Thánh Thần.', chime: false },
      { text: 'Thứ bốn thì ngắm: Đức Chúa Trời cho Đức Bà lên trời. Ta hãy xin cho được ơn chết lành trong tay Đức Mẹ.', chime: true },
      { text: 'Thứ năm thì ngắm: Đức Chúa Trời thưởng Đức Mẹ trên trời triều thiên vinh hiển. Ta hãy xin Đức Mẹ phù hộ cho ta được thưởng cùng Đức Mẹ trên nước Thiên Đàng.', chime: true },
      { text: 'Lạy Nữ Vương Mẹ nhân lành làm cho chúng con được sống, được vui, được cậy, thân lạy Mẹ!', chime: false },
      { text: 'Chúng con con cháu E-va ở chốn khách đày kêu đến cùng Bà, chúng con ở nơi khóc lóc than thở kêu khẩn Bà thương.', chime: false },
      { text: 'Hỡi ôi! Bà là Chủ bầu chúng con, xin ghé mắt thương xem chúng con. Đến sau khỏi đày, xin cho chúng con được thấy Đức Chúa Giêsu con lòng Bà gồm phúc lạ. Ôi khoan thay! Nhân thay! Dịu thay! Thánh Maria trọn đời đồng trinh. Amen.', chime: true }
    ]
  },
  {
    id: 'kinh-thanh-ca-giuse',
    title: 'Kinh Kính Thánh Cả Giuse & Đức Mẹ Lộ Đức',
    subtitle: 'Cầu xin Thánh Cả Giuse bảo trợ gia đình, công việc bình an và ơn chữa lành nơi Hang Đá Lộ Đức',
    category: 'Kính Các Thánh',
    durationSec: 165,
    gracePerVerse: 3,
    completionBonus: 35,
    organChordHz: [293.66, 369.99, 440.00], // Hợp âm Rê Trưởng (D Major)
    beadTempoMs: 890,
    description: 'Lời kinh cậy trông Thánh Cả Giuse - Đấng bảo trợ Hội Thánh và Đức Mẹ Lộ Đức đầy lòng từ mẫu.',
    verses: [
      { text: 'Lạy Thánh Cả Giuse cực trọng, chúng con chạy đến cùng Người trong cơn gian nan, chúng con đã kêu xin Rất Thánh Bạn Người cứu giúp, thì cũng một lòng trông cậy kêu xin Người che chở chúng con.', chime: true },
      { text: 'Vì tình thương mến đã liên kết Người với Đức Trinh Nữ Vô Nhiễm là Mẹ Chúa Trời, và vì tình Cha đã âu yếm ẵm bồng Chúa Giêsu Hài Đồng.', chime: false },
      { text: 'Chúng con khẩn khoản nài xin Người đoái thương đến cơ nghiệp mà Chúa Giêsu Kitô đã lấy Máu Thánh mình chuộc lại, và dùng quyền thế Người mà cứu giúp chúng con trong cơn nguy khốn.', chime: true },
      { text: 'Lạy Đấng coi sóc rất khôn ngoan của Thánh Gia, xin bảo vệ đoàn con tuyển chọn của Chúa Giêsu Kitô.', chime: false },
      { text: 'Lạy Cha rất thương yêu, xin xua đuổi mọi sự dối trá và tội lỗi cho khỏi chúng con.', chime: false },
      { text: 'Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội, Mẹ đã hiện ra nơi Hang Đá Massabielle ban dòng suối chữa lành cho đoàn con đau yếu.', chime: true },
      { text: 'Xin Mẹ Maria và Thánh Cả Giuse hằng che chở chúng con, gìn giữ gia đình chúng con bình an xác hồn. (3 lần)', chime: true }
    ]
  }
];

/**
 * Ba lời kinh tôn kính khi Bái Quỳ & Làm Dấu Thánh Giá trước Bàn Thờ Thánh Thể
 */
export const GENUFLECTION_PRAYERS = [
  {
    order: 1,
    title: 'Bái Quỳ Thứ Nhất',
    target: 'Làm Dấu Thánh Giá & Tôn Thờ Thánh Thể',
    text: 'Nhân danh Cha và Con và Thánh Thần. Amen. Chúng con thờ lạy và ngợi khen Chúa Giêsu Thánh Thể đang ngự thật trong Nhà Tạm Cực Thánh này, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ.',
    prayer: 'Nhân danh Cha và Con và Thánh Thần. Amen. Chúng con thờ lạy và ngợi khen Chúa Giêsu Thánh Thể đang ngự thật trong Nhà Tạm Cực Thánh này, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ.',
    vow: 'Nhân danh Cha và Con và Thánh Thần. Amen. Chúng con thờ lạy và ngợi khen Chúa Giêsu Thánh Thể đang ngự thật trong Nhà Tạm Cực Thánh này, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ.'
  },
  {
    order: 2,
    title: 'Bái Quỳ Thứ Hai',
    target: 'Kính Lạy Thánh Tâm Chúa Giêsu',
    text: 'Lạy Rất Thánh Trái Tim Đức Chúa Giêsu hiền lành và khiêm nhường trong lòng, xin uốn lòng chúng con nên giống Trái Tim Chúa, và ban bình an cho gia đình chúng con.',
    prayer: 'Lạy Rất Thánh Trái Tim Đức Chúa Giêsu hiền lành và khiêm nhường trong lòng, xin uốn lòng chúng con nên giống Trái Tim Chúa, và ban bình an cho gia đình chúng con.',
    vow: 'Lạy Rất Thánh Trái Tim Đức Chúa Giêsu hiền lành và khiêm nhường trong lòng, xin uốn lòng chúng con nên giống Trái Tim Chúa, và ban bình an cho gia đình chúng con.'
  },
  {
    order: 3,
    title: 'Bái Quỳ Thứ Ba',
    target: 'Cầu Khẩn Đức Mẹ Lộ Đức & Thánh Cả Giuse',
    text: 'Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội và Ông Thánh Giuse là Đấng bảo trợ Hội Thánh, xin cầu bầu cho chúng con biết sống trọn niềm tín thác, bác ái và yêu thương.',
    prayer: 'Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội và Ông Thánh Giuse là Đấng bảo trợ Hội Thánh, xin cầu bầu cho chúng con biết sống trọn niềm tín thác, bác ái và yêu thương.',
    vow: 'Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội và Ông Thánh Giuse là Đấng bảo trợ Hội Thánh, xin cầu bầu cho chúng con biết sống trọn niềm tín thác, bác ái và yêu thương.'
  }
];

/**
 * 9 Cấp Bậc Hoa Thiêng & Hành Trình Đức Tin (Virtue Tiers)
 */
export const VIRTUE_TIERS = [
  {
    tier: 1,
    level: 1,
    title: 'Tân Tòng Khởi Bước',
    minGrace: 0,
    minMerit: 0,
    auraColor: '#cbd5e1',
    description: 'Tâm hồn đơn sơ bước qua cửa Thánh Đường, làm dấu Thánh Giá cầu xin ơn bình an.'
  },
  {
    tier: 2,
    level: 2,
    title: 'Tín Hữu Chuyên Cần',
    minGrace: 100,
    minMerit: 100,
    auraColor: '#93c5fd',
    description: 'Siêng năng lần hạt Mân Côi, thắp nến cầu nguyện và chăm sóc Vườn Đàng Thánh Giá.'
  },
  {
    tier: 3,
    level: 3,
    title: 'Người Gieo Hạt Lành',
    minGrace: 500,
    minMerit: 500,
    auraColor: '#6ee7b7',
    description: 'Sống tinh thần Tin Mừng, dâng hoa thiêng và gieo mầm bác ái đến mọi người chung quanh.'
  },
  {
    tier: 4,
    level: 4,
    title: 'Khí Cụ Bình An',
    minGrace: 1500,
    minMerit: 1500,
    auraColor: '#fcd34d',
    description: 'Noi gương Thánh Phanxicô đem yêu thương, tha thứ và hòa bình vào từng ngày sống.'
  },
  {
    tier: 5,
    level: 5,
    title: 'Chiến Sĩ Mân Côi',
    minGrace: 5000,
    minMerit: 5000,
    auraColor: '#f59e0b',
    description: 'Kiên vững lần chuỗi Mân Côi suy niệm các mầu nhiệm Cứu Độ cùng Đức Trinh Nữ Maria.'
  },
  {
    tier: 6,
    level: 6,
    title: 'Ngọn Nến Hiệp Thông',
    minGrace: 15000,
    minMerit: 15000,
    auraColor: '#fb7185',
    description: 'Ngọn lửa đức mến cháy sáng trước Tượng Đài Đức Mẹ, nâng đỡ cộng đoàn trong lời cầu nguyện.'
  },
  {
    tier: 7,
    level: 7,
    title: 'Chứng Nhân Đức Tin',
    minGrace: 50000,
    minMerit: 50000,
    auraColor: '#c084fc',
    description: 'Đời sống thánh thiện tỏa hương nhân đức, trung kiên làm chứng cho Ánh Sáng Phục Sinh.'
  },
  {
    tier: 8,
    level: 8,
    title: 'Trụ Cột Giáo Đường',
    minGrace: 150000,
    minMerit: 150000,
    auraColor: '#60a5fa',
    description: 'Gắn bó phụng sự Nhà Chúa, lan tỏa đức tin, đức cậy và đức mến khắp các Giáo phận.'
  },
  {
    tier: 9,
    level: 9,
    title: 'Hoa Thiêng Viên Mãn',
    minGrace: 500000,
    minMerit: 500000,
    auraColor: '#ffd700',
    description: 'Viên mãn ân sủng và hoa trái Thánh Thần, rạng ngời hào quang thánh thiện nơi Cung Thánh.'
  }
];

/**
 * Tính toán Cấp Bậc Hoa Thiêng & Tiến trình Ân Sủng của Tín hữu
 * @param {number} gracePoints
 * @returns {{ tier: number, level: number, title: string, minGrace: number, nextGrace: number|null, progress: number, auraColor: string, description: string }}
 */
export function getVirtueInfo(gracePoints = 0) {
  const points = Math.max(0, Number(gracePoints) || 0);

  for (let i = VIRTUE_TIERS.length - 1; i >= 0; i--) {
    const current = VIRTUE_TIERS[i];
    if (points >= current.minGrace) {
      const next = VIRTUE_TIERS[i + 1] || null;
      if (!next) {
        return {
          tier: current.tier,
          level: current.tier,
          title: current.title,
          minGrace: current.minGrace,
          nextGrace: null,
          progress: 1.0,
          auraColor: current.auraColor,
          description: current.description
        };
      }
      const range = next.minGrace - current.minGrace;
      const progress = Math.min(1, Math.max(0, (points - current.minGrace) / range));
      return {
        tier: current.tier,
        level: current.tier,
        title: current.title,
        minGrace: current.minGrace,
        nextGrace: next.minGrace,
        progress: Number(progress.toFixed(4)),
        auraColor: current.auraColor,
        description: current.description
      };
    }
  }

  const first = VIRTUE_TIERS[0];
  return {
    tier: first.tier,
    level: first.tier,
    title: first.title,
    minGrace: first.minGrace,
    nextGrace: VIRTUE_TIERS[1].minGrace,
    progress: 0,
    auraColor: first.auraColor,
    description: first.description
  };
}

/**
 * Danh sách 27 Giáo Phận Công Giáo Việt Nam (3 Giáo tỉnh: Hà Nội, Huế, Sài Gòn)
 */
export const DIOCESES_LIST = [
  // Giáo tỉnh Hà Nội (11 Giáo phận)
  { code: 'HAN', name: 'Tổng Giáo phận Hà Nội', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'BNI', name: 'Giáo phận Bắc Ninh', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'BCH', name: 'Giáo phận Bùi Chu', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'HPH', name: 'Giáo phận Hải Phòng', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'HTI', name: 'Giáo phận Hà Tĩnh', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'HHO', name: 'Giáo phận Hưng Hóa', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'LSN', name: 'Giáo phận Lạng Sơn - Cao Bằng', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'PDI', name: 'Giáo phận Phát Diệm', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'TBI', name: 'Giáo phận Thái Bình', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'THO', name: 'Giáo phận Thanh Hóa', provinceGroup: 'Giáo tỉnh Hà Nội' },
  { code: 'VIN', name: 'Giáo phận Vinh', provinceGroup: 'Giáo tỉnh Hà Nội' },

  // Giáo tỉnh Huế (6 Giáo phận)
  { code: 'HUE', name: 'Tổng Giáo phận Huế', provinceGroup: 'Giáo tỉnh Huế' },
  { code: 'BMT', name: 'Giáo phận Ban Mê Thuột', provinceGroup: 'Giáo tỉnh Huế' },
  { code: 'DNG', name: 'Giáo phận Đà Nẵng', provinceGroup: 'Giáo tỉnh Huế' },
  { code: 'KTU', name: 'Giáo phận Kon Tum', provinceGroup: 'Giáo tỉnh Huế' },
  { code: 'NTR', name: 'Giáo phận Nha Trang', provinceGroup: 'Giáo tỉnh Huế' },
  { code: 'QNH', name: 'Giáo phận Quy Nhơn', provinceGroup: 'Giáo tỉnh Huế' },

  // Giáo tỉnh Sài Gòn (10 Giáo phận)
  { code: 'SGN', name: 'Tổng Giáo phận Sài Gòn - TP.HCM', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'BRV', name: 'Giáo phận Bà Rịa', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'CTH', name: 'Giáo phận Cần Thơ', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'DLA', name: 'Giáo phận Đà Lạt', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'LXU', name: 'Giáo phận Long Xuyên', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'MTH', name: 'Giáo phận Mỹ Tho', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'PTH', name: 'Giáo phận Phan Thiết', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'PCU', name: 'Giáo phận Phú Cường', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'VLO', name: 'Giáo phận Vĩnh Long', provinceGroup: 'Giáo tỉnh Sài Gòn' },
  { code: 'XLO', name: 'Giáo phận Xuân Lộc', provinceGroup: 'Giáo tỉnh Sài Gòn' }
];

/**
 * Bảng màu phẩm phục phụng vụ & trang phục giáo dân tham dự Thánh Lễ
 */
export const OUTFIT_COLORS = [
  { id: 'trang', name: 'Áo Trắng Tinh Khôi', hex: '#f8f9fa' },
  { id: 'xanh_duc_me', name: 'Áo Dài Xanh Đức Mẹ', hex: '#1e3a8a' },
  { id: 'do_phung_vu', name: 'Áo Lễ Đỏ Phụng Vụ', hex: '#7f1d1d' },
  { id: 'xanh_thuong_nien', name: 'Áo Lễ Xanh Mùa Thường Niên', hex: '#065f46' },
  { id: 'tim_mua_chay', name: 'Áo Tím Mùa Chay/Mùa Vọng', hex: '#581c87' },
  { id: 'vang_ca_doan', name: 'Áo Ca Đoàn Vàng Kim', hex: '#d4af37' }
];

/**
 * 6 Hình Tượng Tín Hữu & Tu Sĩ Công Giáo 3D (Church Avatar Styles)
 */
export const CHURCH_AVATAR_STYLES = [
  {
    id: 'GIAO_DAN_AO_TRANG',
    name: 'Giáo Dân Áo Trắng',
    icon: '🕊️',
    desc: 'Trang phục sơ mi trắng trang nghiêm tham dự Thánh Lễ Chúa Nhật'
  },
  {
    id: 'CA_VIEN_AO_CHOANG',
    name: 'Ca Viên Ca Đoàn',
    icon: '🎼',
    desc: 'Áo choàng Ca đoàn cùng nơ cổ vàng kim hát Thánh Ca tôn vinh Chúa'
  },
  {
    id: 'AO_DAI_CONG_GIAO',
    name: 'Áo Dài Công Giáo',
    icon: '🌹',
    desc: 'Áo dài truyền thống Việt Nam thanh lịch dự lễ trọng & rước kiệu Đức Mẹ'
  },
  {
    id: 'LINH_MUC_CHU_TE',
    name: 'Linh Mục Phụng Vụ',
    icon: '✝️',
    desc: 'Áo Lễ Casula và dây Stola thêu Thánh Giá vàng cử hành Phụng vụ'
  },
  {
    id: 'SOEUR_DONG_MEN_THANH_GIA',
    name: 'Nữ Tu (Soeur)',
    icon: '🙏',
    desc: 'Tu phục Nữ tu có lúp đầu trang nhã, tận hiến cầu nguyện và phục vụ'
  },
  {
    id: 'THIEU_NHI_THANH_THE',
    name: 'Thiếu Nhi Thánh Thể',
    icon: '⚜️',
    desc: 'Đồng phục trắng và khăn quàng đỏ Thiếu Nhi Thánh Thể đơn sơ thánh thiện'
  }
];

/**
 * Lời Kêu Gọi & Huấn Từ Của Cha Chủ Tế (Priest Invitations & Pastoral Blessings)
 */
export const PRIEST_INVITATIONS = [
  {
    id: 'loi-chao-dau-le',
    title: '✝️ Lời Chào Đầu Lễ & Hiệp Thông',
    priestName: 'Cha Chủ Tế Phêrô',
    text: 'Nhân danh Cha và Con và Thánh Thần. Nguyện xin ân sủng của Đức Giêsu Kitô, Chúa chúng ta, tình yêu của Chúa Cha, và ơn thông hiệp của Chúa Thánh Thần ở cùng tất cả anh chị em!'
  },
  {
    id: 'keu-goi-man-coi',
    title: '📿 Lời Kêu Gọi Lần Hạt Mân Côi',
    priestName: 'Cha Chủ Tế Phêrô',
    text: 'Anh chị em thân mến, Mẹ Maria tại Fatima và Lộ Đức luôn tha thiết mời gọi chúng ta siêng năng lần hạt Mân Côi. Xin mời cộng đoàn cùng quỳ bên ghế gỗ, dâng những đóa hoa thiêng cầu bình an cho gia đình và Giáo phận.'
  },
  {
    id: 'keu-goi-long-thuong-xot',
    title: '🕊️ Giờ Kinh Lòng Chúa Thương Xót',
    priestName: 'Cha Linh Hướng Giuse',
    text: 'Giờ đây trước Thánh Tâm Chúa Giêsu và Nhà Tạm Cực Thánh, chúng ta hãy đặt trọn gánh nặng cuộc đời vào Lòng Thương Xót Chúa. Lạy Chúa Giêsu, con tín thác vào Chúa!'
  },
  {
    id: 'phep-lanh-cuoi-le',
    title: '🙌 Phép Lành Trọng Thể & Sai Đi',
    priestName: 'Cha Chủ Tế Phêrô',
    text: 'Chúa ở cùng anh chị em. Xin Thiên Chúa Toàn Năng là Cha, và Con, và Thánh Thần ban phúc lành và gìn giữ anh chị em bình an trong suốt tuần mới. Lễ xong, chúc anh chị em đi bình an!'
  }
];

/**
 * Các Nghi Lễ Phụng Vụ Công Giáo Trọng Thể (Catholic Liturgical Rites)
 */
export const CATHOLIC_LITURGICAL_RITES = [
  {
    id: 'rite-sign-of-cross',
    title: '✝️ Nghi Thức Làm Dấu Thánh Giá & Thờ Lạy Thánh Thể',
    subtitle: 'Bái gối hướng về Nhà Tạm Cực Thánh & Bàn Thờ Chúa',
    graceReward: 5,
    zone: 'CUNG_THANH',
    organChordHz: [261.63, 329.63, 392.00],
    spokenText: 'Nhân danh Cha và Con và Thánh Thần. Amen. Lạy Chúa Giêsu Thánh Thể, chúng con thờ lạy, cảm tạ và yêu mến Chúa đang ngự thật trong Bí Tích Tình Yêu.'
  },
  {
    id: 'rite-eucharistic-adoration',
    title: '☀️ Nghi Thức Chầu Mình Thánh Chúa & Phép Lành Thánh Thể',
    subtitle: 'Quỳ gối tôn thờ Mặt Nhật Thánh Thể trên Bàn Thờ Cẩm Thạch',
    graceReward: 10,
    zone: 'CUNG_THANH',
    organChordHz: [349.23, 440.00, 523.25],
    spokenText: 'Đây Nhiệm Tích vô cùng cao quý, nào chúng ta phục lạy tôn thờ. Xin Chúa Giêsu Thánh Thể giơ tay chúc lành cho mọi gia đình trong Giáo xứ chúng con.'
  },
  {
    id: 'rite-marian-procession',
    title: '🌹 Nghi Thức Dâng Hoa Kính Đức Mẹ Lộ Đức',
    subtitle: 'Hiệp thông dâng hoa hồng và khấn nguyện tại Hang Đá Đức Mẹ',
    graceReward: 10,
    zone: 'HANG_DA_DUC_ME',
    organChordHz: [293.66, 369.99, 440.00],
    spokenText: 'Con xin dâng Mẹ đóa hoa hồng thắm tươi cùng trọn cả tâm hồn. Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội, xin cầu cho chúng con!'
  },
  {
    id: 'rite-stations-of-cross',
    title: '⛪ Nghi Thức Đi Đàng Thánh Giá Chúa Giêsu',
    subtitle: 'Suy niệm cuộc Thương Khó Chúa Giêsu dọc hai bên cánh Thánh Đường',
    graceReward: 8,
    zone: 'THANH_DUONG',
    organChordHz: [220.00, 261.63, 329.63],
    spokenText: 'Chúng con thờ lạy và ngợi khen Chúa Kitô, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ. Xin thương xót chúng con!'
  },
  {
    id: 'rite-father-diep-intercession',
    title: '🙏 Khấn Nguyện Cùng Cha Phanxicô Trương Bửu Diệp',
    subtitle: 'Cầu xin ơn bình an, sức khỏe và công việc tại Đài Cha Diệp',
    graceReward: 8,
    zone: 'DAI_THANH_GIUSE',
    organChordHz: [196.00, 246.94, 293.66],
    spokenText: 'Lạy Cha Phanxicô Xaviê Trương Bửu Diệp, người mục tử nhân lành đã hiến mạng sống vì đoàn chiên, xin chuyển cầu cùng Chúa ban ơn bình an cho gia đình chúng con.'
  }
];
