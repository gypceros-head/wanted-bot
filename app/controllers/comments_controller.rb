class CommentsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_post

  def create
    @comment = current_user.comments.build(comment_params.merge(post: @post))
    @comments = @post.comments.includes(:user).order(:created_at)

    if @comment.save
      redirect_to post_path(@post), notice: "コメントを投稿しました。"
    else
      flash.now[:alert] = @comment.errors.full_messages.join(" / ")
      render "posts/show", status: :unprocessable_entity
    end
  end

  def destroy
    comment = current_user.comments.find(params[:id])
    comment.destroy!
    redirect_to post_path(@post), notice: "コメントを削除しました。"
  end

  private

  def set_post
    @post = Post.find(params[:post_id])
  end

  def comment_params
    params.require(:comment).permit(:body)
  end
end
