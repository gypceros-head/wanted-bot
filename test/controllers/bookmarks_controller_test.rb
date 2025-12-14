require "test_helper"

class BookmarksControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @post = posts(:published_one)
    @user = users(:one)
  end

  test "should redirect create when not signed in" do
    assert_no_difference("Bookmark.count") do
      post post_bookmark_url(@post)
    end
    assert_response :redirect
  end

  test "should create bookmark when signed in" do
    sign_in @user
    assert_difference("Bookmark.count", 1) do
      post post_bookmark_url(@post)
    end
    assert_redirected_to post_url(@post)
  end

  test "should not create duplicate bookmark" do
    sign_in @user
    Bookmark.create!(user: @user, post: @post)

    assert_no_difference("Bookmark.count") do
      post post_bookmark_url(@post)
    end
    assert_redirected_to post_url(@post)
  end

  test "should destroy bookmark when signed in" do
    sign_in @user
    Bookmark.create!(user: @user, post: @post)

    assert_difference("Bookmark.count", -1) do
      delete post_bookmark_url(@post)
    end
    assert_redirected_to post_url(@post)
  end

  test "should redirect destroy when not signed in" do
    Bookmark.create!(user: @user, post: @post)

    assert_no_difference("Bookmark.count") do
      delete post_bookmark_url(@post)
    end
    assert_response :redirect
  end
end
