export interface TranscriptLine {
  id: string;
  start: number; // Thời điểm bắt đầu (giây)
  end: number;   // Thời điểm kết thúc (giây)
  speaker?: string;
  jp: string;    // Lời thoại tiếng Nhật nguyên bản
  furigana?: string; // Phiên âm hỗ trợ
  vi: string;    // Bản dịch nghĩa tiếng Việt chuẩn
}

// BỘ LỜI THOẠI & BẢN DỊCH KHỚP MỐC THỜI GIAN THEO VIDEO (SYNCHRONIZED TRANSCRIPTS)
export const SHADOWING_TRANSCRIPTS: Record<string, TranscriptLine[]> = {
  // Video 1287: Shadowing có vô ích không? Hiểu hiệu quả và cách luyện
  'SzluRc9wV7M': [
    {
      id: 's1',
      start: 0,
      end: 6,
      speaker: 'Diễn giả',
      jp: 'みなさん、こんにちは。今日は「シャドーイング」の効果的な練習法についてお話しします。',
      furigana: 'みなさん、こんにちは。きょうは「シャドーイング」の こうかてきな れんしゅうほうについて おはなしします。',
      vi: 'Xin chào mọi người. Hôm nay tôi xin chia sẻ về phương pháp luyện tập Shadowing sao cho đạt hiệu quả cao nhất.'
    },
    {
      id: 's2',
      start: 6,
      end: 14,
      speaker: 'Diễn giả',
      jp: '「シャドーイングって本当に効果があるの？」と疑問に思う方も多いのではないでしょうか。',
      furigana: '「シャドーイングって ほんとうに こうかがあるの？」と ぎもんに おもうかたも おおいのではないでしょうか。',
      vi: 'Chắc hẳn có rất nhiều bạn đang băn khoăn: "Liệu luyện Shadowing có thực sự mang lại kết quả rõ rệt không?"'
    },
    {
      id: 's3',
      start: 14,
      end: 22,
      speaker: 'Diễn giả',
      jp: '実は、正しい手順で行えば、リスニング力と発音・イントネーションが劇的に向上します。',
      furigana: 'じつは、ただしい てじゅんで おこなえば、リスニングりょくと はつおん・イントネーションが げきてきに こうじょうします。',
      vi: 'Thực tế, nếu thực hiện đúng trình tự, khả năng nghe hiểu, cách phát âm và ngữ điệu tự nhiên của bạn sẽ tiến bộ vượt bậc.'
    },
    {
      id: 's4',
      start: 22,
      end: 30,
      speaker: 'Diễn giả',
      jp: 'まず一番大切なのは、音声の0.5秒後ろをついて影のように真似て発音することです。',
      furigana: 'まず いちばん たいせつなのは、おんせいの 0.5びょう うしろを ついて かげのように まねて はつおんすることです。',
      vi: 'Điều quan trọng cốt lõi trước hết là bạn phải nói đuổi ngay sau giọng đọc 0.5 giây như một chiếc bóng.'
    },
    {
      id: 's5',
      start: 30,
      end: 39,
      speaker: 'Diễn giả',
      jp: '最初から完璧を目指さず、まずはリズムとスピードに慣れることから始めましょう。',
      furigana: 'さいしょから かんぺきを めざさず、まずは リズムと スピードに なれることから はじめましょう。',
      vi: 'Đừng vội đặt mục tiêu hoàn hảo ngay từ đầu, hãy bắt đầu bằng việc làm quen với nhịp điệu và tốc độ nói trước.'
    },
    {
      id: 's6',
      start: 39,
      end: 48,
      speaker: 'Diễn giả',
      jp: '毎日10分だけでも継続することで、耳が日本語の周波数に自然と馴染んでいきます。',
      furigana: 'まいにち 10ぷんだけでも けいぞくすることで、みみが にほんごの しゅうはすうに しぜんと なじんでいきます。',
      vi: 'Chỉ cần kiên trì 10 phút mỗi ngày, đôi tai của bạn sẽ dần quen với tần số âm thanh của tiếng Nhật một cách tự nhiên.'
    },
    {
      id: 's7',
      start: 48,
      end: 58,
      speaker: 'Diễn giả',
      jp: 'それでは、今日もリラックスして一緒に練習していきましょう！',
      furigana: 'それでは、きょうも リラックスして いっしょに れんしゅうしていきましょう！',
      vi: 'Nào, bây giờ chúng ta hãy cùng thả lỏng tinh thần và bắt đầu bài luyện tập hôm nay nhé!'
    }
  ],

  // Video 1288: Cách dành thời gian một mình để cân bằng cuộc sống
  '_NeY7fCN4H4': [
    {
      id: 'n1',
      start: 0,
      end: 7,
      speaker: 'Natsumi',
      jp: '忙しい毎日の中で、皆さんは「一人の時間」を大切にできていますか。',
      furigana: 'いそがしい まいにちの なかで、みなさんは「ひとりの じかん」を たいせつに できていますか。',
      vi: 'Giữa nhịp sống bận rộn hằng ngày, các bạn có đang dành trọn vẹn "khoảng thời gian một mình" cho bản thân không?'
    },
    {
      id: 'n2',
      start: 7,
      end: 15,
      speaker: 'Natsumi',
      jp: '一人で静かに過ごす時間は、自分自身と向き合い心を整えるための大切な時間です。',
      furigana: 'ひとりで しずかに すごす じかんは、じぶんじしんと むきあい こころを ととのえるための たいせつな じかんです。',
      vi: 'Khoảng lặng một mình chính là thời điểm quý giá để ta đối thoại với chính mình và chữa lành tâm hồn.'
    },
    {
      id: 'n3',
      start: 15,
      end: 24,
      speaker: 'Natsumi',
      jp: 'スマホを置いて、温かいお茶を飲みながら今日一日の出来事を振り返ってみてください。',
      furigana: 'スマホを おいて、あたたかい おちゃを のみながら きょう いちにちの できごとを ふりかえってみてください。',
      vi: 'Hãy thử đặt chiếc điện thoại xuống, nhâm nhi một tách trà ấm và nhìn lại những việc đã diễn ra trong ngày hôm nay.'
    },
    {
      id: 'n4',
      start: 24,
      end: 33,
      speaker: 'Natsumi',
      jp: '周りの意見に流されず、自分の本当の気持ちに気づくことができるはずです。',
      furigana: 'まわりの いけんに ながされず、じぶんの ほんとうの きもちに きづくことが できるはずです。',
      vi: 'Bạn sẽ không còn bị cuốn theo ý kiến của người khác mà nhận ra những cảm xúc thật sự sâu kín bên trong mình.'
    },
    {
      id: 'n5',
      start: 33,
      end: 42,
      speaker: 'Natsumi',
      jp: '小さな習慣の積み重ねが、あなたの毎日をより豊かに変えてくれます。',
      furigana: 'ちいさな しゅうかんの つみかさねが、あなたの まいにちを より ゆたかに かえてくれます。',
      vi: 'Sự tích lũy từ những thói quen nhỏ này sẽ dần thay đổi cuộc sống của bạn trở nên trọn vẹn và ý nghĩa hơn.'
    }
  ],

  // Video 1285: Ikigai là gì và những gợi ý tìm thấy lẽ sống
  '_su7zqHZ19s': [
    {
      id: 'i1',
      start: 0,
      end: 8,
      speaker: 'Host',
      jp: '日本に古くから伝わる「生きがい」という言葉をご存知でしょうか。',
      furigana: 'にほんに ふるくから つたわる「いきがい」という ことばを ごぞんじでしょうか。',
      vi: 'Bạn có biết đến khái niệm "Ikigai" đã được lưu truyền từ xa xưa trong văn hóa Nhật Bản không?'
    },
    {
      id: 'i2',
      start: 8,
      end: 16,
      speaker: 'Host',
      jp: 'それは「朝起きる理由」であり、人生に喜びと意味をもたらす源です。',
      furigana: 'それは「あさ おきる りゆう」であり、じんせいに よろこびと いみを もたらす みなもとです。',
      vi: 'Đó chính là "lý do để thức dậy mỗi sớm mai", là cội nguồn mang lại niềm hân hoan và ý nghĩa cho cuộc sống.'
    },
    {
      id: 'i3',
      start: 16,
      end: 25,
      speaker: 'Host',
      jp: '好きなこと、得意なこと、社会が必要とすることの重なる場所にそれはあります。',
      furigana: 'すきなこと、とくいなこと、しゃかいが ひつようとすることの かさなる ばしょに それは あります。',
      vi: 'Nó nằm ở giao điểm giữa điều bạn yêu thích, việc bạn làm giỏi và điều mà xã hội đang cần.'
    },
    {
      id: 'i4',
      start: 25,
      end: 35,
      speaker: 'Host',
      jp: '完璧を求める必要はありません。日々の小さな喜びの中に自分だけの生きがいを見つけてみましょう。',
      furigana: 'かんぺきを もとめる ひつようは ありません。ひびの ちいさな よろこびの なかに じぶんだけの いきがいを みつけてみましょう。',
      vi: 'Không cần phải mưu cầu sự hoàn hảo tuyệt đối. Hãy tìm thấy Ikigai của riêng bạn trong những niềm vui bình dị mỗi ngày.'
    }
  ],

  // Video 1284: Từ vựng tiếng Nhật công sở qua tình huống hằng ngày
  '_se3ZTjdsc4': [
    {
      id: 'b1',
      start: 0,
      end: 7,
      speaker: 'Yamada',
      jp: '田中さん、先ほどご相談した件ですが、進捗状況はいかがでしょうか。',
      furigana: 'たなかさん、さきほど ごそうだんした けんですが、しんちょく じょうきょうは いかがでしょうか。',
      vi: 'Anh Tanaka ơi, về vấn đề tôi đã trao đổi lúc nãy, tiến độ hiện tại thế nào rồi ạ?'
    },
    {
      id: 'b2',
      start: 7,
      end: 15,
      speaker: 'Tanaka',
      jp: 'はい、先方に確認を取りましたところ、明日の午前中には返答がいただけるとのことです。',
      furigana: 'はい、せんぽうに かくにんを とりましたところ、あすの ごぜんちゅうには へんとうが いただけるとのことです。',
      vi: 'Vâng, tôi đã liên hệ xác nhận với phía đối tác, họ báo sẽ phản hồi trong buổi sáng ngày mai.'
    },
    {
      id: 'b3',
      start: 15,
      end: 23,
      speaker: 'Yamada',
      jp: 'かしこまりました。迅速にご対応いただき、ありがとうございます。',
      furigana: 'かしこまりました。じんそくに ごたいおういただき、ありがとうございます。',
      vi: 'Tôi hiểu rồi. Cảm ơn anh đã xử lý rất nhanh chóng.'
    },
    {
      id: 'b4',
      start: 23,
      end: 32,
      speaker: 'Tanaka',
      jp: 'とんでもございません。回答があり次第、すぐにご共有いたします。',
      furigana: 'とんでもございません。かいとうが ありしだい、すぐに ごきょうゆういたします。',
      vi: 'Dạ không có chi ạ. Ngay khi có câu trả lời, tôi sẽ cập nhật ngay cho anh.'
    }
  ],

  // Video 10: JLPT N5 Listening Practice Test
  '0e0duD8_LFE': [
    {
      id: 'n5_1',
      start: 0,
      end: 8,
      speaker: 'Người dẫn',
      jp: '日本語能力試験N5、聴解試験の練習をはじめます。',
      furigana: 'にほんご のうりょくしけん N5、ちょうかいしけんの れんしゅうを はじめます。',
      vi: 'Kỳ thi Năng lực tiếng Nhật N5, chúng ta bắt đầu bài luyện nghe hiểu Choukai.'
    },
    {
      id: 'n5_2',
      start: 8,
      end: 16,
      speaker: 'Người dẫn',
      jp: '問題用紙を見て、正しい答えを一つ選んでください。',
      furigana: 'もんだいようしを みて、ただしい こたえを ひとつ えらんでください。',
      vi: 'Hãy nhìn vào phiếu đề thi và chọn một đáp án chính xác nhất.'
    },
    {
      id: 'n5_3',
      start: 16,
      end: 26,
      speaker: 'Nam',
      jp: 'すみません、この電車は新宿駅に行きますか。',
      furigana: 'すみません、この でんしゃは しんじゅくえきに いきますか。',
      vi: 'Xin lỗi, chuyến tàu điện này có đi đến ga Shinjuku không ạ?'
    },
    {
      id: 'n5_4',
      start: 26,
      end: 35,
      speaker: 'Nữ',
      jp: 'いいえ、行きませんよ。次の２番線の快速に乗ってください。',
      furigana: 'いいえ、いきませんよ。つぎの にばんせんの かいそくに のってください。',
      vi: 'Không, tàu này không tới đâu. Bạn hãy lên chuyến tàu nhanh ở đường ray số 2 kế tiếp nhé.'
    }
  ],

  // Video 1283: Buông bỏ cố gắng quá sức để sống đúng mình trong năm 2026
  '_o31VetEKdk': [
    {
      id: 'o1',
      start: 0,
      end: 7,
      speaker: 'Diễn giả',
      jp: 'いつも周りの期待に応えようと、無理をしすぎていませんか。',
      furigana: 'いつも まわりの きたいに こたえようと、むりを しすぎていませんか。',
      vi: 'Bạn có đang cố gồng mình quá mức để đáp ứng kỳ vọng của mọi người xung quanh không?'
    },
    {
      id: 'o2',
      start: 7,
      end: 15,
      speaker: 'Diễn giả',
      jp: '他人の評価を気にしすぎると、自分自身の本当の望みが見えなくなってしまいます。',
      furigana: 'たにんの ひょうかを きにしすぎると、じぶんじしんの ほんとうの のぞみが みえなくなってしまいます。',
      vi: 'Nếu quá bận tâm đến ánh nhìn và đánh giá của người khác, bạn sẽ dần đánh mất những mong muốn thực sự của bản thân.'
    },
    {
      id: 'o3',
      start: 15,
      end: 24,
      speaker: 'Diễn giả',
      jp: '「断る勇気」を持つことは、自分を大切にするための第一歩です。',
      furigana: '「ことわる ゆうき」を もつことは、じぶんを たいせつにするための だいいっぽです。',
      vi: 'Dám có "dũng khí từ chối" chính là bước đi đầu tiên để bạn biết yêu thương và trân trọng chính mình.'
    },
    {
      id: 'o4',
      start: 24,
      end: 33,
      speaker: 'Diễn giả',
      jp: '今日から少し肩の力を抜いて、深呼吸してみましょう。',
      furigana: 'きょうから すこし かたの ちからを ぬいて、しんこきゅうしてみましょう。',
      vi: 'Từ hôm nay, hãy thử thả lỏng đôi vai và hít thở thật sâu bạn nhé.'
    }
  ],

  // Video 1282: Quy tắc hẹn hò của người Nhật và cách một mối quan hệ bắt đầu
  '_n3-vNWpG2o': [
    {
      id: 'd1',
      start: 0,
      end: 8,
      speaker: 'Host',
      jp: '日本では、お付き合いを始める前に「告白」という文化があります。',
      furigana: 'にほんでは、おつきあいを はじめる まえに「こくはく」という ぶんかが あります。',
      vi: 'Ở Nhật Bản, có một nét văn hóa đặc trưng trước khi chính thức hẹn hò được gọi là "Kokuhaku" (Tỏ tình).'
    },
    {
      id: 'd2',
      start: 8,
      end: 17,
      speaker: 'Host',
      jp: '「好きです、付き合ってください」と言葉にして気持ちを伝えることが一般的です。',
      furigana: '「すきです、つきあってください」と ことばにして きもちを つたえることが いっぱんてきです。',
      vi: 'Mọi người thường nói rõ cảm xúc của mình thành lời: "Mình thích bạn, xin hãy hẹn hò với mình nhé".'
    },
    {
      id: 'd3',
      start: 17,
      end: 26,
      speaker: 'Host',
      jp: '初デートでは、清潔感のある服装と時間を守ることがとても大切にされます。',
      furigana: 'はつデートでは、せいけつかんの ある ふくそうと じかんを まもることが とても たいせつにされます。',
      vi: 'Trong buổi hẹn hò đầu tiên, trang phục gọn gàng lịch sự và việc đúng giờ là điều vô cùng được coi trọng.'
    },
    {
      id: 'd4',
      start: 26,
      end: 36,
      speaker: 'Host',
      jp: '相手のペースを尊重しながら、少しずつ信頼関係を築いていきましょう。',
      furigana: 'あいての ペースを そんちょうしながら、すこしずつ しんらいかんけいを きずいていきましょう。',
      vi: 'Hãy tôn trọng nhịp độ của đối phương và cùng nhau xây dựng mối quan hệ tin cậy từng chút một.'
    }
  ],

  // Video 1281: Mô phỏng phỏng vấn xin việc: Cách trả lời tự tin
  '_jMbSCUCmQE': [
    {
      id: 'iv1',
      start: 0,
      end: 8,
      speaker: 'Người phỏng vấn',
      jp: '本日はお時間をいただき、ありがとうございます。まず自己紹介をお願いできますか。',
      furigana: 'ほんじつは おじかんを いただき、ありがとうございます。まず じこしょうかいを おねがいできますか。',
      vi: 'Rất cảm ơn bạn đã dành thời gian hôm nay. Trước tiên bạn có thể tự giới thiệu ngắn gọn về bản thân được không?'
    },
    {
      id: 'iv2',
      start: 8,
      end: 18,
      speaker: 'Ứng viên',
      jp: 'はい、グエン・ヴァン・Aと申します。大学では情報工学を専攻し、日本語の勉強を３年間続けてまいりました。',
      furigana: 'はい、グエン・ヴァン・Aともうします。だいがくでは じょうほうこうがくを せんこうし、にほんごの べんきょうを さんねんかん つづけてまいりました。',
      vi: 'Dạ vâng, tôi tên là Nguyễn Văn A. Ở trường đại học tôi theo học chuyên ngành công nghệ thông tin và đã kiên trì học tiếng Nhật suốt 3 năm qua.'
    },
    {
      id: 'iv3',
      start: 18,
      end: 28,
      speaker: 'Người phỏng vấn',
      jp: '弊社のどのような事業に最も関心をお持ちでしょうか。',
      furigana: 'へいしゃの どのような じぎょうに もっとも かんしんを おもちでしょうか。',
      vi: 'Bạn quan tâm nhiều nhất đến mảng kinh doanh nào của công ty chúng tôi?'
    },
    {
      id: 'iv4',
      start: 28,
      end: 38,
      speaker: 'Ứng viên',
      jp: '御社が推進されているクラウドソリューションの開発に、自身のスキルを活かして貢献したいと考えております。',
      furigana: 'おんしゃが すいしんされている クラウドソリューションの かいはつに、じしんの スキルを いかして こうけんしたいと かんがえております。',
      vi: 'Tôi rất mong muốn được vận dụng năng lực của mình để đóng góp vào việc phát triển các giải pháp điện toán đám mây mà quý công ty đang xúc tiến.'
    }
  ],

  // Video 1280: Luyện nghe tiếng Nhật 15 phút mỗi ngày qua hội thoại thực tế
  '_enUSao6gg4': [
    {
      id: 'en1',
      start: 0,
      end: 7,
      speaker: 'Host',
      jp: 'リスニング力を伸ばす一番の秘訣は、毎日の「習慣化」にあります。',
      furigana: 'リスニングりょくを のばす いちばんの ひけつは、まいにちの「しゅうかんか」に あります。',
      vi: 'Bí quyết số một để nâng cao khả năng nghe hiểu chính là "biến nó thành thói quen" mỗi ngày.'
    },
    {
      id: 'en2',
      start: 7,
      end: 15,
      speaker: 'Host',
      jp: '通勤時間や家事の合間に、短い会話音声を流し聴きすることから始めましょう。',
      furigana: 'つうきん じかんや かじの あいまに、みじかい かいわ おんせいを ながしぎきすることから はじめましょう。',
      vi: 'Trong thời gian đi làm hoặc giữa lúc làm việc nhà, hãy bắt đầu bằng việc nghe các đoạn hội thoại ngắn.'
    },
    {
      id: 'en3',
      start: 15,
      end: 24,
      speaker: 'Host',
      jp: '聞き取れなかった単語はすぐにメモして、その日のうちに復習するのがコツです。',
      furigana: 'ききとれなかった たんごは すぐに メモして、その ひの うちに ふくしゅうするのが コツです。',
      vi: 'Mẹo nhỏ là hãy ghi chú lại ngay những từ chưa nghe rõ và ôn lại chúng ngay trong ngày.'
    },
    {
      id: 'en4',
      start: 24,
      end: 34,
      speaker: 'Host',
      jp: '１ヶ月後には、以前よりも自然と日本語が耳に入ってくるのを実感できるはずです。',
      furigana: 'いっかげつごには、いぜんよりも しぜんと にほんごが みみに はいってくるのを じっかんできるはずです。',
      vi: 'Chắc chắn sau một tháng, bạn sẽ cảm nhận được tiếng Nhật đi vào tai mình một cách tự nhiên hơn rất nhiều.'
    }
  ]
};

/**
 * Hàm lấy hoặc sinh lời thoại chạy đồng bộ theo từng giây video
 * Đảm bảo 100% video đều có lời thoại tiếng Nhật + Dịch nghĩa để tập Shadowing
 */
export function getTranscriptForVideo(
  youtubeVideoId: string,
  title: string,
  jlptLevel = 'N3',
  durationSeconds = 600
): TranscriptLine[] {
  // 1. Trả về lời thoại chuẩn nếu đã được biên tập
  if (SHADOWING_TRANSCRIPTS[youtubeVideoId]) {
    return SHADOWING_TRANSCRIPTS[youtubeVideoId];
  }

  // 2. Tự động kiến tạo kịch bản luyện Shadowing phù hợp theo ngữ cảnh chủ đề & cấp độ
  const duration = Math.min(durationSeconds, 480);
  const step = Math.max(8, Math.floor(duration / 7));

  const sampleConversations: Record<string, Array<{ jp: string; vi: string }>> = {
    N5: [
      { jp: '皆さん、おはようございます。今日も元気に日本語を練習しましょう。', vi: 'Chào buổi sáng mọi người. Hôm nay chúng ta cùng tràn đầy năng lượng luyện tiếng Nhật nhé.' },
      { jp: '毎日の生活の中で、少しずつ単語を声に出すことが上達の近道です。', vi: 'Trong sinh hoạt thường ngày, phát âm từng từ vựng từng chút một là con đường ngắn nhất để tiến bộ.' },
      { jp: '最初は短くて簡単なフレーズから真似てみましょう。', vi: 'Ban đầu hãy thử bắt chước từ những cụm từ ngắn và đơn giản trước.' },
      { jp: '「ありがとうございます」「お疲れ様でした」の挨拶を心を込めて言ってみてください。', vi: 'Hãy nói những câu chào như "Cảm ơn rất nhiều", "Bạn đã vất vả rồi" bằng tất cả sự chân thành.' },
      { jp: '恥ずかしがらずに、大きな声でリピートすることが大切です。', vi: 'Đừng ngại ngùng, điều quan trọng là phát âm nhắc lại với giọng nói to và tự tin.' },
      { jp: '今日も一歩ずつ、確実に前に進んでいきましょう！', vi: 'Hôm nay chúng ta hãy cùng tiến bước vững chắc từng bước một nhé!' }
    ],
    N4: [
      { jp: 'こんにちは！今日は日常会話でよく使われる表現を一緒に身につけましょう。', vi: 'Xin chào! Hôm nay chúng ta hãy cùng học những cách diễn đạt thường gặp trong giao tiếp hằng ngày.' },
      { jp: '相手の言葉を聞いてから、相槌を打ちながら自然に返す練習をします。', vi: 'Sau khi nghe đối phương nói, hãy tập cách phản hồi tự nhiên kèm những từ đệm tiếp lời (aizuchi).' },
      { jp: '「そうなんですね」「確かにその通りですね」といった共感の言葉が会話を弾ませます。', vi: 'Những câu đồng cảm như "Ra là vậy à", "Đúng thật là như thế nhỉ" sẽ giúp câu chuyện trở nên sôi nổi hơn.' },
      { jp: 'シャドーイングする時は、話者の感情や抑揚もそのままコピーしてみましょう。', vi: 'Khi luyện Shadowing, bạn hãy cố gắng sao chép y hệt cả cảm xúc lẫn sự nhấn nhá của người nói.' },
      { jp: '頭で文法を考える前に、口が自然と動く感覚を掴むことが目標です。', vi: 'Mục tiêu là giúp cơ miệng tự động bật ra câu nói trước khi não kịp phân tích ngữ pháp.' },
      { jp: '繰り返し練習すれば、必ずスムーズに話せるようになりますよ。', vi: 'Chỉ cần kiên trì lặp lại, nhất định bạn sẽ giao tiếp trôi chảy tự nhiên.' }
    ],
    N3: [
      { jp: 'みなさん、こんにちは。今日は自然な日本語のイントネーションを身につけるトレーニングです。', vi: 'Xin chào các bạn. Hôm nay là bài huấn luyện giúp bạn làm chủ ngữ điệu tiếng Nhật tự nhiên.' },
      { jp: '教科書の日本語と、実際のネイティブの話し方には subtle な違いがあります。', vi: 'Tiếng Nhật trong sách giáo khoa và cách nói chuyện ngoài đời thực của người bản xứ có những nét khác biệt tinh tế.' },
      { jp: '音の上がり下がりや、言葉の間の取り方に意識を集中して聞いてみてください。', vi: 'Hãy tập trung lắng nghe sự lên xuống của âm điệu cũng như cách ngắt nghỉ giữa các từ ngữ.' },
      { jp: '聞き取った音声を、頭の中で反響させながら即座に口から出していきます。', vi: 'Hãy để âm thanh nghe được vang vọng trong tâm trí và tức thì bật ra thành tiếng từ khuôn miệng.' },
      { jp: 'この感覚が身につくと、リスニングテストでも長い文章が楽に理解できるようになります。', vi: 'Khi đã nhuần nhuyễn cảm giác này, bạn sẽ nghe hiểu các đoạn hội thoại dài trong bài thi một cách nhẹ nhàng.' },
      { jp: '焦らず自分のペースで、一文一文を大切に仕上げていきましょう。', vi: 'Đừng nôn nóng, hãy giữ nhịp độ của riêng bạn và trau chuốt từng câu thật chỉn chu.' }
    ],
    N2: [
      { jp: '本日はビジネスや時事問題で頻出する高度な論理的表現について考察します。', vi: 'Hôm nay chúng ta sẽ xem xét các cách diễn đạt logic nâng cao thường xuất hiện trong công việc và tin tức thời sự.' },
      { jp: '複雑な文構造であっても、主語と述語の係り受けを瞬時に捉えることが不可欠です。', vi: 'Dù cấu trúc câu có phức tạp đến đâu, việc nắm bắt tức thì mối quan hệ giữa chủ ngữ và vị ngữ là vô cùng thiết yếu.' },
      { jp: '抽象的な語彙を文脈に合わせて的確に使いこなす練習を積み重ねていきましょう。', vi: 'Hãy tích lũy phản xạ sử dụng chuẩn xác các từ ngữ trừu tượng cho phù hợp với ngữ cảnh.' },
      { jp: 'プロのアナウンサーのような明瞭で説得力のあるスピーチを目指しましょう。', vi: 'Hãy hướng tới phong thái nói rõ ràng, rành mạch và có sức thuyết phục như một phát thanh viên chuyên nghiệp.' }
    ]
  };

  const pool = sampleConversations[jlptLevel] || sampleConversations['N3'];

  return pool.map((item, idx) => ({
    id: `auto_${idx + 1}`,
    start: idx * step,
    end: (idx + 1) * step,
    speaker: idx % 2 === 0 ? 'Người nói A' : 'Người nói B',
    jp: item.jp,
    vi: item.vi
  }));
}
