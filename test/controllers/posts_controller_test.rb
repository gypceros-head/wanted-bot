require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get posts_url
    assert_response :success
  end

  test "should get show" do
    post = posts(:one)
    get post_url(post)
    assert_response :success
  end

  test "should get new" do
    sign_in users(:one)
    get new_post_url
    assert_response :success
  end

  test "should get edit" do
    sign_in users(:one)
    post = posts(:one)
    get edit_post_url(post)
    assert_response :success
  end
end
