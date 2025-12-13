class PostsController < ApplicationController
  # 認証・権限
  before_action :authenticate_user!, except: %i[index show]

  # 対象投稿の取得
  before_action :set_post, only: %i[show edit update destroy destroy_image toggle_publish]

  # 投稿の所有者のみ操作可能
  before_action :authorize_owner!, only: %i[edit update destroy destroy_image toggle_publish]

  # new/create は投稿元Blueprintが必須
  before_action :require_blueprint!, only: %i[new create]

  # edit/update ではフォーム表示用にBlueprintも参照
  before_action :set_blueprint, only: %i[edit update]

  def index
    # 公開投稿のみ + 新しい順 + 安定ソート
    @posts =
      Post.published
        .with_attached_image
        .order(created_at: :desc, id: :desc)
        .page(params[:page])
        .per(20)
  end

  def show
    # 非公開投稿は所有者のみ閲覧可
    ensure_viewable!
  end

  def new
    # @blueprint は require_blueprint! でセット済み
    @post = current_user.posts.build
  end

  def create
    # @blueprint は require_blueprint! でセット済み
    @post = current_user.posts.build(post_params)

    ActiveRecord::Base.transaction do
      @post.save!

      # Blueprint -> Post を確定
      @blueprint.update!(post: @post)

      # BlueprintのプレビューPNGを投稿画像として流用
      attach_blueprint_preview!
    end

    redirect_to @post, notice: "投稿を作成しました。"
  rescue ActiveRecord::RecordInvalid => e
    # バリデーション/設計図紐づけ/添付処理のいずれかで失敗した場合
    flash.now[:alert] = "投稿を作成できませんでした。入力内容を確認してください。"
    Rails.logger.warn("[PostsController#create] #{e.class}: #{e.message}")
    render :new, status: :unprocessable_entity
  end

  def edit
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: "投稿を更新しました。"
    else
      flash.now[:alert] = "投稿を更新できませんでした。入力内容を確認してください。"
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    if @post.destroy
      redirect_to posts_path, notice: "投稿を削除しました。"
    else
      redirect_to @post, alert: "投稿を削除できませんでした。"
    end
  end

  def destroy_image
    # 投稿画像のみ削除（投稿そのものは残す）
    @post.image.purge if @post.image.attached?

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to edit_post_path(@post), notice: "画像を削除しました。" }
    end
  end

  def toggle_publish
    # 公開/非公開の反転（所有者のみ）
    @post.update!(is_published: !@post.is_published?)
    redirect_to @post, notice: "公開設定を更新しました。"
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def set_blueprint
    @blueprint = @post.blueprint
  end

  def authorize_owner!
    return if @post.user == current_user

    redirect_to posts_path, alert: "この投稿を編集する権限がありません。"
  end

  def require_blueprint!
    blueprint_id = params[:blueprint_id] || params.dig(:post, :blueprint_id)

    if blueprint_id.blank?
      redirect_to posts_path, alert: "投稿する設計図が指定されていません。"
      return
    end

    @blueprint = Blueprint.find(blueprint_id)

    # 二重紐づけ防止（すでに投稿済みの設計図を再利用させない）
    if @blueprint.post_id.present?
      redirect_to @blueprint, alert: "この設計図は既に投稿済みです。"
    end
  end

  def ensure_viewable!
    return if @post.is_published?
    return if user_signed_in? && @post.user == current_user

    head :not_found
  end

  def attach_blueprint_preview!
    unless @blueprint.preview_image.attached?
      # ここで例外にしてトランザクションをロールバックさせる
      raise ActiveRecord::RecordInvalid.new(@post), "Blueprint preview_image is missing"
    end

    @post.image.attach(@blueprint.preview_image.blob)
  end

  def post_params
    # MVP: 画像アップロードを禁止するため :image を外す
    params.require(:post).permit(:title, :caption, :is_published)
  end
end
