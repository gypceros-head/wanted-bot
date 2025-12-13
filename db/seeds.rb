# db/seeds.rb
require "tempfile"
require "base64"

DESIRED_POSTS = 45
TEST_EMAIL = "test@example.com"

# 1x1 PNG (透明) fallback
PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8n9kAAAAASUVORK5CYII="

def build_png_tempfile(label:)
  tmp = Tempfile.new([ "seed-post-", ".png" ])
  tmp.binmode

  # MiniMagick が使えるなら、少し大きめの画像を生成（一覧で見やすい）
  begin
    require "mini_magick"

    MiniMagick::Tool::Convert.new do |convert|
      convert.size "800x600"
      convert.xc "#f1f5f9"            # slate-100 相当の背景
      convert.gravity "center"
      convert.pointsize "42"
      convert.fill "#0f172a"          # slate-900 相当
      convert.draw "text 0,0 '#{label}'"
      convert << tmp.path
    end
  rescue LoadError, StandardError
    # 画像生成に失敗しても seeds が落ちないよう、最小PNGで代替
    tmp.write(Base64.decode64(PNG_1X1_BASE64))
  end

  tmp.rewind
  tmp
end

# テストユーザー（既存ならそれを使用）
user = User.find_or_create_by!(email: TEST_EMAIL) do |u|
  u.name = "テストユーザー"
  u.password = "password"
  u.password_confirmation = "password"
end
puts "Test user: #{user.email} (id=#{user.id})"

current_count = Post.published.count
to_create = [ DESIRED_POSTS - current_count, 0 ].max

if to_create.zero?
  puts "Published posts already exist (#{current_count}). Skip creating posts."
  exit
end

# Blueprint が preview_image を持つか（環境差で落とさない）
blueprint_has_preview_image =
  Blueprint.respond_to?(:reflect_on_attachment) &&
  Blueprint.reflect_on_attachment(:preview_image).present?

puts "Creating #{to_create} published posts (current published: #{current_count} / desired: #{DESIRED_POSTS})..."
puts "Blueprint preview_image attach: #{blueprint_has_preview_image ? 'enabled' : 'skipped'}"

to_create.times do |n|
  i = current_count + n + 1

  post = nil
  blueprint = nil

  # 1) まず DB だけ作る（ここでは添付しない）
  ActiveRecord::Base.transaction do
    post = Post.create!(
      user: user,
      title: "テスト投稿 #{i}",
      caption: "これはテスト投稿 #{i} です。ページネーション表示確認用のダミーキャプションです。",
      is_published: true,
      created_at: Time.current - i.minutes,
      updated_at: Time.current - i.minutes
    )

    blueprint = post.create_blueprint!(
      user: user,
      name: "Blueprint for Post #{i}",
      editor_state: { "meta" => [] }
    )
  end

  # 2) トランザクションの外で添付（ここなら after_commit が即時に走り、IOが閉じられにくい）
  post_tmp = build_png_tempfile(label: "POST #{i}")
  post.image.attach(
    io: post_tmp,
    filename: "post-#{post.id}.png",
    content_type: "image/png"
  )
  post_tmp.close! # attach 後に閉じる

  if blueprint_has_preview_image
    bp_tmp = build_png_tempfile(label: "BP #{i}")
    blueprint.preview_image.attach(
      io: bp_tmp,
      filename: "blueprint-preview-#{blueprint.id}.png",
      content_type: "image/png"
    )
    bp_tmp.close!
  end
end

puts "Done. Published posts: #{Post.published.count}"
