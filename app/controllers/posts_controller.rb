class PostsController < ApplicationController
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_post, only: %i[show edit update destroy destroy_image]
  before_action :authorize_owner!, only: %i[edit update destroy destroy_image]
  before_action :require_blueprint!, only: %i[new create]
  before_action :set_blueprint_for_form, only: %i[edit update]

  def index
    # 公開済みの投稿を新しい順に取得
    @posts = Post.where(is_published: true).order(created_at: :desc)
  end

  def show
    # @post は set_post で取得済み
  end

  def new
    @post = current_user.posts.build
    # @blueprint は require_blueprint! でセット済み
  end

  def create
    @post = current_user.posts.build(post_params)

    ActiveRecord::Base.transaction do
      @post.save!

      # Blueprint -> Post を確定
      @blueprint.update!(post: @post)

      # BlueprintのプレビューPNGを投稿画像として添付
      unless @blueprint.preview_image.attached?
        raise ActiveRecord::RecordInvalid.new(@post), "Blueprint preview_image is missing"
      end

      @post.image.attach(@blueprint.preview_image.blob)
    end
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
    if @post.image.attached?
      @post.image.purge
    end

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to edit_post_path(@post), notice: "画像を削除しました。" }
    end
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def set_blueprint_for_form
    @blueprint = @post.blueprint
  end

  def authorize_owner!
    unless @post.user == current_user
      redirect_to posts_path, alert: "この投稿を編集する権限がありません。"
    end
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

  def post_params
    # MVP: 画像アップロードを禁止するため :image を外す
    params.require(:post).permit(:title, :caption, :is_published)
  end
end
