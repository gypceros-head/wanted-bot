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
    user = users(:one)
    sign_in user

    blueprint = blueprints(:draft_one)
    get new_post_url(blueprint_id: blueprint.id)

    assert_response :success
  end

  test "should get edit" do
    sign_in users(:one)
    post = posts(:one)
    get edit_post_url(post)
    assert_response :success
  end

  test "should redirect new with already posted blueprint" do
    sign_in users(:one)
    blueprint = blueprints(:one) # post: one が付いている
    get new_post_url(blueprint_id: blueprint.id)
    assert_redirected_to blueprint_url(blueprint)
  end
end
