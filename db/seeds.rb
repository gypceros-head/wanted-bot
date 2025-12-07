# テストユーザーを作成（既にいればそれを使う）
user = User.find_by(email: "test@example.com")

unless user
  user = User.create!(
    name: "テストユーザー",
    email: "test@example.com",
    password: "password",
    password_confirmation: "password"
  )
  puts "Test user created: #{user.email}"
else
  puts "Test user already exists: #{user.email}"
end

# テスト投稿を複数作成
if Post.count == 0
  3.times do |i|
    Post.create!(
      user: user,
      title: "テスト投稿 #{i + 1}",
      caption: <<~CAPTION,
        これはテスト投稿 #{i + 1} です。
        動作確認用のダミーキャプションです。
      CAPTION
      is_published: true
    )
  end
  puts "Test posts created."
else
  puts "Posts already exist. Skip creating test posts."
end
