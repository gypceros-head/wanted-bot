class BookmarksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_post

  def create
    current_user.bookmarks.find_or_create_by!(post: @post)
    redirect_to post_path(@post), notice: "ブックマークしました。"
  end

  def destroy
    current_user.bookmarks.find_by!(post: @post).destroy!
    redirect_to post_path(@post), notice: "ブックマークを解除しました。"
  end

  private

  def set_post
    @post = Post.find(params[:post_id])
  end
end
