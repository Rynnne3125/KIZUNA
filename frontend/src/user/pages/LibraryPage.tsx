import React, { useState } from 'react';

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');

  const listeningItems = [
    {
      id: 'l1',
      title: 'Hội thoại: Đặt bàn ăn tại nhà hàng Nhật',
      level: 'N4',
      duration: '03:45',
      mondai: 'Choukai Task-based',
      audioUrl: 'https://firebasestorage.googleapis.com/...',
      dialogue: [
        { speaker: 'Khách', jp: 'すみません、今夜7時に4名で予約できますか。', vi: 'Xin lỗi, tôi có thể đặt bàn 4 người vào 7h tối nay được không?' },
        { speaker: 'Nhân viên', jp: 'はい、禁煙席と喫煙席のどちらをご希望でしょうか。', vi: 'Vâng, quý khách muốn chọn khu vực hút thuốc hay không hút thuốc ạ?' }
      ]
    },
    {
      id: 'l2',
      title: 'Hội thoại: Báo cáo công việc buổi sáng (Chourei)',
      level: 'N3',
      duration: '04:12',
      mondai: 'Choukai Business',
      audioUrl: 'https://firebasestorage.googleapis.com/...',
      dialogue: [
        { speaker: 'Nhân viên', jp: '昨日の進捗についてご報告いたします。', vi: 'Tôi xin phép báo cáo về tiến độ công việc ngày hôm qua.' },
        { speaker: 'Trưởng phòng', jp: 'はい、課題や遅れはありましたか。', vi: 'Được rồi, có vấn đề phát sinh hay bị trễ hạn mục nào không?' }
      ]
    },
    {
      id: 'l3',
      title: 'Choukai JLPT N2: Phát biểu tại hội nghị xúc tiến đầu tư',
      level: 'N2',
      duration: '05:30',
      mondai: 'Choukai Sogo Rikai',
      audioUrl: 'https://firebasestorage.googleapis.com/...',
      dialogue: [
        { speaker: 'Diễn giả', jp: '本日は我が社の新規事業戦略についてご説明申し上げます。', vi: 'Hôm nay tôi xin phép được trình bày về chiến lược kinh doanh mới của công ty chúng tôi.' }
      ]
    }
  ];

  const videoItems = [
    {
      id: 'v1',
      title: 'Luyện Shadowing tiếng Nhật đời thường - 15 phút mỗi ngày',
      level: 'N4',
      channel: 'Kizuna Nihongo Studio',
      duration: '15:20',
      category: 'Shadowing'
    },
    {
      id: 'v2',
      title: 'Nghe Chép Chính Tả (Dictation) - Bí quyết phản xạ Kaiwa',
      level: 'N3',
      channel: 'Tokyo Japanese Daily',
      duration: '12:45',
      category: 'Dictation'
    }
  ];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: 6 }}>
            🎬 THƯ VIỆN HỌC LIỆU ĐA PHƯƠNG TIỆN
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Kho Video Shadowing & Bài Nghe Choukai Đã Lưu
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Luyện nghe chép chính tả (Dictation) và luyện nói phản xạ (Shadowing) theo video thực tế.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 'var(--radius-sm)' }}>
          <button
            onClick={() => setActiveTab('audio')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'audio' ? '#ffffff' : 'transparent',
              color: activeTab === 'audio' ? '#dc2626' : '#64748b',
              boxShadow: activeTab === 'audio' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            🎧 Bài nghe Choukai ({listeningItems.length})
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'video' ? '#ffffff' : 'transparent',
              color: activeTab === 'video' ? '#dc2626' : '#64748b',
              boxShadow: activeTab === 'video' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            🎬 Video Shadowing ({videoItems.length})
          </button>
        </div>
      </div>

      {activeTab === 'audio' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {listeningItems.map(item => (
            <div key={item.id} className="kizuna-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-secondary">{item.level}</span>
                  <span className="badge badge-warning">{item.mondai}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>⏱️ {item.duration}</span>
                </div>
                <button className="btn btn-primary btn-sm">
                  ▶️ Phát Audio
                </button>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                {item.title}
              </h3>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                  📜 Kịch bản hội thoại & Dịch nghĩa:
                </div>
                {item.dialogue.map((d, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong style={{ color: '#dc2626' }}>{d.speaker}:</strong>{' '}
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{d.jp}</span>
                    <div style={{ color: '#64748b', fontSize: 12, marginLeft: 16 }}>{d.vi}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {videoItems.map(v => (
            <div key={v.id} className="kizuna-card" style={{ padding: 20 }}>
              <div style={{
                height: 160,
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 48,
                marginBottom: 16,
                position: 'relative'
              }}>
                ▶️
                <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}>
                  {v.duration}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span className="badge badge-secondary">{v.level}</span>
                <span className="badge badge-primary">{v.category}</span>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {v.title}
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Kênh: {v.channel}
              </div>

              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Mở phòng luyện Shadowing ➔
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
