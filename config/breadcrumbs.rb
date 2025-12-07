crumb :root do
  link "ホーム", root_path
end

crumb :posts do
  link "投稿一覧", posts_path
  parent :root
end

crumb :post do |post|
  link post.title, post_path(post)
  parent :posts
end
