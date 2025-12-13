require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  # Index / Show

  test "should get index" do
    get posts_url
    assert_response :success
  end

  test "should get show when post is published" do
    post = posts(:published_one)

    get post_url(post)
    assert_response :success
  end

  test "should get 404 when post is unpublished and user is not signed in" do
    post = posts(:one)

    get post_url(post)
    assert_response :not_found
  end

  test "should get 404 when post is unpublished and user is not the owner" do
    post = posts(:one)

    sign_in users(:two)
    get post_url(post)
    assert_response :not_found
  end

  test "should get show when post is unpublished and user is the owner" do
    post = posts(:one)

    sign_in users(:one)
    get post_url(post)
    assert_response :success
  end

  # Publish / Unpublish

  test "owner can toggle publish" do
    post = posts(:one)

    sign_in users(:one)
    patch toggle_publish_post_url(post)

    assert_redirected_to post_url(post)
    post.reload
    assert_equal true, post.is_published
  end

  test "non-owner cannot toggle publish" do
    post = posts(:one)

    sign_in users(:two)
    patch toggle_publish_post_url(post)

    assert_redirected_to posts_url
    post.reload
    assert_equal false, post.is_published
  end

  # New / Edit

  test "should get new" do
    sign_in users(:one)

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

  # Guards

  test "should redirect new with already posted blueprint" do
    sign_in users(:one)

    blueprint = blueprints(:one) # post: one が付いている
    get new_post_url(blueprint_id: blueprint.id)

    assert_redirected_to blueprint_url(blueprint)
  end
end
