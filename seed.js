/**
 * 众像美术馆 - 初始数据种子脚本
 * 运行：node seed.js
 */
const bcrypt = require('bcryptjs')
const { getDB, saveDB } = require('./db/init')

async function seed() {
  console.log('初始化数据库...')
  var db = await getDB()

  // 清空旧数据
  var tables = ['user_achievements', 'view_history', 'favorites', 'likes', 'comments', 'posts', 'artworks', 'halls', 'exhibitions', 'discover_items', 'achievements', 'users']
  tables.forEach(function(t) { db.run('DELETE FROM ' + t) })
  console.log('已清空旧数据')

  // 用户
  var adminPass = bcrypt.hashSync('admin123', 10)
  db.run('INSERT INTO users (username, password, nickname, avatar, role, bio) VALUES (?, ?, ?, ?, ?, ?)', ['admin', adminPass, '馆长', '', 'admin', '美术馆管理员，负责策展和审核'])
  db.run('INSERT INTO users (username, password, nickname, avatar, role, bio) VALUES (?, ?, ?, ?, ?, ?)', ['artist_zhang', bcrypt.hashSync('123456', 10), '张大千', '', 'curator', '水墨画家，擅长山水画'])
  db.run('INSERT INTO users (username, password, nickname, avatar, role, bio) VALUES (?, ?, ?, ?, ?, ?)', ['photographer_li', bcrypt.hashSync('123456', 10), '李明', '', 'visitor', '独立摄影师，爱好当代艺术'])
  console.log('创建 3 个用户')

  // 展览
  db.run('INSERT INTO exhibitions (title, emoji, description, curator, status, date_range, visitors, hall_count, color1, color2, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ['印象派光影之旅', '🎨', '探索莫奈、雷诺阿等印象派大师对光与色的革命性诠释', '馆长', '进行中', '2026.03.01 - 2026.06.30', '12847', 3, '#5B8C5A', '#A8D5BA', '["印象派","法国","19世纪"]'])
  db.run('INSERT INTO exhibitions (title, emoji, description, curator, status, date_range, visitors, hall_count, color1, color2, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ['东方意境当代水墨', '🖌️', '传统水墨在当代语境下的全新表达', '张大千', '进行中', '2026.04.15 - 2026.08.15', '6392', 2, '#4A7C59', '#8BB8A0', '["水墨","当代","东方"]'])
  db.run('INSERT INTO exhibitions (title, emoji, description, curator, status, date_range, visitors, hall_count, color1, color2, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ['数字浪潮艺术展', '💻', 'AI生成艺术、算法美学与数字互动装置', '馆长', '即将开幕', '2026.05.01 - 2026.09.01', '0', 4, '#6366F1', '#A78BFA', '["数字艺术","AI","未来"]'])
  db.run('INSERT INTO exhibitions (title, emoji, description, curator, status, date_range, visitors, hall_count, color1, color2, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ['镜头下的城市', '📷', '街头摄影与都市景观的视觉叙事', '李明', '已结束', '2025.12.01 - 2026.03.01', '23156', 2, '#374151', '#6B7280', '["摄影","城市","纪实"]'])
  console.log('创建 4 个展览')

  // 展厅
  db.run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?,?,?,?)', [1, '莫奈厅', '睡莲系列与日出印象', 0])
  db.run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?,?,?,?)', [1, '雷诺阿厅', '人物画与光线下的人体', 1])
  db.run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?,?,?,?)', [1, '后印象派厅', '梵高、塞尚的延伸探索', 2])
  db.run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?,?,?,?)', [2, '传统致敬厅', '山水与花鸟的现代演绎', 0])
  db.run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?,?,?,?)', [2, '实验水墨厅', '抽象与观念水墨', 1])
  console.log('创建 5 个展厅')

  // 作品
  var arts = [
    ['睡莲', '🪷', '克劳德·莫奈', '1906', '油画', '#B8D4E3', '', '莫奈花园中的睡莲系列，是印象派的巅峰之作', 1, 1, 2341, 89],
    ['日出·印象', '🌅', '克劳德·莫奈', '1872', '油画', '#F4C542', '', '印象派得名之作，描绘了勒阿弗尔港口的日出', 1, 1, 1856, 67],
    ['煎饼磨坊的舞会', '💃', '皮埃尔-奥古斯特·雷诺阿', '1876', '油画', '#E8A87C', '', '雷诺阿最著名的作品之一', 1, 2, 1567, 45],
    ['星月夜', '🌙', '文森特·梵高', '1889', '油画', '#2D4A7A', '', '后印象派的标志性作品', 1, 3, 3892, 156],
    ['向日葵', '🌻', '文森特·梵高', '1888', '油画', '#F5C842', '', '梵高最具代表性的花卉系列', 1, 3, 2763, 98],
    ['墨竹图', '🎋', '张大千', '1965', '水墨', '#D4D4D4', '', '传统水墨竹子的当代演绎', 2, 1, 876, 34],
    ['山水之间', '⛰️', '张大千', '1970', '水墨', '#A8C5A0', '', '泼墨山水与抽象元素的融合', 2, 1, 654, 21],
    ['云烟过眼', '☁️', '张大千', '1975', '水墨', '#E8E0D0', '', '晚年泼彩风格的代表作', 2, 2, 543, 18],
    ['霓虹都市', '🌃', '李明', '2025', '摄影', '#1A1A2E', '', '深夜城市的霓虹光影', 4, 1, 1234, 56],
    ['胡同里的阳光', '☀️', '李明', '2025', '摄影', '#F0E68C', '', '北京胡同中温暖的光影', 4, 1, 987, 43],
    ['雨中的行人', '🌧️', '李明', '2025', '摄影', '#7F8C8D', '', '雨天街头的行人剪影', 4, 2, 756, 31]
  ]
  arts.forEach(function(a) {
    db.run('INSERT INTO artworks (title, emoji, artist, year, category, bg_color, image_url, description, exhibition_id, hall_id, likes, comments_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', a)
  })
  console.log('创建 11 件作品')

  // 帖子
  db.run('INSERT INTO posts (user_id, content, images, tags, exhibition_id, location, likes, comments_count) VALUES (?,?,?,?,?,?,?,?)',
    [2, '今天在东方意境展看到了张大千晚年的泼彩山水，那种色彩的张力太震撼了！强烈推荐大家来看看', '[]', '["水墨","展览"]', 2, '众像美术馆', 45, 12])
  db.run('INSERT INTO posts (user_id, content, images, tags, exhibition_id, location, likes, comments_count) VALUES (?,?,?,?,?,?,?,?)',
    [3, '印象派光影之旅的莫奈厅，每一幅睡莲都像是会呼吸的', '[]', '["印象派","莫奈"]', 1, '众像美术馆', 67, 23])
  db.run('INSERT INTO posts (user_id, content, images, tags, exhibition_id, location, likes, comments_count) VALUES (?,?,?,?,?,?,?,?)',
    [2, '在老城区拍到的一组光影照片，准备整理一下投到镜头下的城市展', '[]', '["摄影","街拍"]', 4, '北京胡同', 89, 34])
  console.log('创建 3 条帖子')

  // 评论
  var comments = [
    [3, 'artwork', 1, '莫奈的睡莲，永远的神！每次看都有新的感受', 23],
    [2, 'artwork', 4, '梵高的星月夜，那种旋转的笔触让人着迷', 18],
    [3, 'artwork', 4, '在美术馆原作前看比图片震撼一百倍', 15],
    [2, 'artwork', 7, '传统水墨也能这么现代，大开眼界', 9],
    [3, 'artwork', 10, '拍得太好了，光感十足', 12],
    [2, 'post', 2, '下次一起去！', 5]
  ]
  comments.forEach(function(c) { db.run('INSERT INTO comments (user_id, target_type, target_id, content, likes) VALUES (?,?,?,?,?)', c) })
  console.log('创建 6 条评论')

  // 收藏
  var favs = [[2,'artwork',1],[2,'artwork',4],[2,'artwork',5],[3,'artwork',1],[3,'artwork',4],[3,'artwork',10],[2,'exhibition',2],[3,'exhibition',1]]
  favs.forEach(function(f) { db.run('INSERT INTO favorites (user_id, target_type, target_id) VALUES (?,?,?)', f) })
  console.log('创建 8 条收藏')

  // 点赞
  var likes = [[2,'artwork',4],[3,'artwork',1],[2,'post',2],[3,'post',1]]
  likes.forEach(function(l) { db.run('INSERT INTO likes (user_id, target_type, target_id) VALUES (?,?,?)', l) })
  console.log('创建 4 条点赞')

  // 发现内容
  var discovers = [
    ['topic', '🎨', '今日推荐', '编辑精选，每日更新', 9999, 0],
    ['topic', '🔥', '热门话题', '当下最受关注的艺术话题', 5432, 1],
    ['guide', '📖', '新手观展指南', '第一次来美术馆？这些技巧要知道', 3210, 2],
    ['guide', '📷', '拍摄技巧', '在美术馆拍出好照片的小窍门', 2876, 3],
    ['activity', '🎉', '周末特别活动', '本周六下午：水墨画体验工坊', 1234, 4],
    ['activity', '🎤', '策展人对谈', '下周五晚：与张大千的对话', 987, 5],
    ['topic', '💻', 'AI艺术讨论', '人工智能创作的作品算不算艺术？', 4567, 6]
  ]
  discovers.forEach(function(d) { db.run('INSERT INTO discover_items (type, emoji, title, description, hot, sort_order) VALUES (?,?,?,?,?,?)', d) })
  console.log('创建 7 条发现内容')

  // 成就
  var achievements = [
    ['👀', '初来乍到', '首次浏览一幅作品', 'view', 1],
    ['🖼️', '策展新秀', '首次上传自己的作品', 'upload', 1],
    ['❤️', '文艺青年', '给5幅作品点赞', 'like', 5],
    ['⭐', '收藏家', '收藏10幅作品', 'fav', 10],
    ['💬', '评论达人', '发表10条评论', 'post', 10],
    ['🏆', '人气画家', '作品累计获得100个赞', 'exhibit', 100],
    ['🏛️', '博物馆常客', '浏览100幅作品', 'view', 100],
    ['👑', '艺术大师', '上传20幅作品', 'upload', 20]
  ]
  achievements.forEach(function(a) { db.run('INSERT INTO achievements (emoji, title, description, condition_type, condition_value) VALUES (?,?,?,?,?)', a) })
  console.log('创建 8 个成就')

  // 用户统计
  db.run('UPDATE users SET stats_fav = 3, stats_view = 56, stats_like = 1, stats_exhibit = 3 WHERE username = ?', ['artist_zhang'])
  db.run('UPDATE users SET stats_fav = 3, stats_view = 42, stats_like = 2, stats_exhibit = 3 WHERE username = ?', ['photographer_li'])

  saveDB()
  console.log('\n\x1b[32m播种完成！\x1b[0m')
  console.log('测试账号：')
  console.log('  管理员：admin / admin123')
  console.log('  策展人：artist_zhang / 123456')
  console.log('  游客：photographer_li / 123456')
}

seed().catch(function(e) { console.error('播种失败:', e); process.exit(1) })
