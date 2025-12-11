class PostsController < ApplicationController
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_post, only: %i[show edit update destroy destroy_image]
  before_action :authorize_owner!, only: %i[edit update destroy destroy_image]

  def index
    # 公開済みの投稿を新しい順に取得
    @posts = Post.where(is_published: true).order(created_at: :desc)
  end

  def show
    # @post は set_post で取得済み
  end

  def new
    @post = current_user.posts.build
  end

  def create
    @post = current_user.posts.build(post_params)

    if @post.save
      redirect_to @post, notice: "投稿を作成しました。"
    else
      flash.now[:alert] = "投稿を作成できませんでした。入力内容を確認してください。"
      render :new, status: :unprocessable_entity
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

  def authorize_owner!
    unless @post.user == current_user
      redirect_to posts_path, alert: "この投稿を編集する権限がありません。"
    end
  end

  # strong parameters 後で定義
  def post_params
    params.require(:post).permit(:title, :caption, :is_published, :image)
  end
end
