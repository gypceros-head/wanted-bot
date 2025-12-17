crumb :root do
  link "ホーム", root_path
end

crumb :terms do
  link "利用規約", terms_path
  parent :root
end

crumb :privacy do
  link "プライバシーポリシー", privacy_path
  parent :root
end

crumb :posts do
  link "投稿一覧", posts_path
  parent :root
end

crumb :post do |post|
  link post.title, post_path(post)
  parent :posts
end
