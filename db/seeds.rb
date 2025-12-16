# db/seeds.rb

POSTS_PER_USER = 5

puts "== Seeding posts for existing users =="

users = User.limit(3).to_a

if users.empty?
  puts "No users found. Please create users first."
  exit
end

users.each_with_index do |user, user_index|
  puts "User: #{user.email} (id=#{user.id})"

  existing_count = user.posts.count
  to_create = [ POSTS_PER_USER - existing_count, 0 ].max

  if to_create.zero?
    puts "  Posts already exist (#{existing_count}). Skip."
    next
  end

  to_create.times do |i|
    index = existing_count + i + 1

    Post.create!(
      user: user,
      title: "Seed Post #{user_index + 1}-#{index}",
      caption: "ユーザー#{user.name}によるテスト投稿 #{index} です。",
      is_published: index.odd?, # 奇数だけ公開（動作確認用）
      created_at: Time.current - (user_index * 10 + index).minutes,
      updated_at: Time.current - (user_index * 10 + index).minutes
    )
  end

  puts "  Created #{to_create} posts."
end

puts "== Done =="
puts "Total posts: #{Post.count}"
puts "Published posts: #{Post.published.count}"
