require "test_helper"

class CommentsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @post = posts(:published_one)
    @owner = users(:one)
    @other = users(:two)
  end

  test "should redirect create when not signed in" do
    assert_no_difference("Comment.count") do
      post post_comments_url(@post), params: { comment: { body: "hi" } }
    end
    assert_response :redirect
  end

  test "should create comment when signed in" do
    sign_in @owner
    assert_difference("Comment.count", 1) do
      post post_comments_url(@post), params: { comment: { body: "hello" } }
    end
    assert_redirected_to post_url(@post)
  end

  test "should not create comment with blank body" do
    sign_in @owner
    assert_no_difference("Comment.count") do
      post post_comments_url(@post), params: { comment: { body: "" } }
    end
    assert_response :unprocessable_entity
  end

  test "should not create comment over maximum length" do
    sign_in @owner
    assert_no_difference("Comment.count") do
      post post_comments_url(@post), params: { comment: { body: "a" * 1001 } }
    end
    assert_response :unprocessable_entity
  end

  test "should destroy own comment" do
    sign_in @owner
    comment = Comment.create!(user: @owner, post: @post, body: "to be deleted")

    assert_difference("Comment.count", -1) do
      delete post_comment_url(@post, comment)
    end
    assert_redirected_to post_url(@post)
  end

  test "should not destroy other user's comment" do
    comment = Comment.create!(user: @owner, post: @post, body: "protected")
    sign_in @other

    assert_no_difference("Comment.count") do
      delete post_comment_url(@post, comment)
    end
    assert_response :not_found
  end
end
