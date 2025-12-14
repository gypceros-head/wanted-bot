require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @published_post = posts(:published_one)
    @unpublished_post = posts(:one)

    @owner = users(:one)
    @other = users(:two)
  end

  # Index

  test "should get index" do
    get posts_url
    assert_response :success
  end

  test "should filter bookmarked posts when bookmarked=1 and signed in" do
    bookmarked_post = posts(:published_one)
    not_bookmarked_post = posts(:published_two)

    Bookmark.create!(user: @owner, post: bookmarked_post)
    sign_in @owner

    get posts_url(bookmarked: "1")
    assert_response :success
    assert_includes @response.body, bookmarked_post.title
    refute_includes @response.body, not_bookmarked_post.title
  end


  # Show (authorization)

  test "should get show when post is published" do
    get post_url(@published_post)
    assert_response :success
  end

  test "should get 404 when post is unpublished and user is not signed in" do
    get post_url(@unpublished_post)
    assert_response :not_found
  end

  test "should get 404 when post is unpublished and user is not the owner" do
    sign_in @other
    get post_url(@unpublished_post)
    assert_response :not_found
  end

  test "should get show when post is unpublished and user is the owner" do
    sign_in @owner
    get post_url(@unpublished_post)
    assert_response :success
  end

  # Publish / Unpublish

  test "owner can toggle publish" do
    sign_in @owner

    patch toggle_publish_post_url(@unpublished_post)
    assert_redirected_to post_url(@unpublished_post)

    @unpublished_post.reload
    assert_equal true, @unpublished_post.is_published
  end

  test "non-owner cannot toggle publish" do
    sign_in @other

    patch toggle_publish_post_url(@unpublished_post)
    assert_redirected_to posts_url

    @unpublished_post.reload
    assert_equal false, @unpublished_post.is_published
  end

  # New / Edit (login required)

  test "should get new" do
    sign_in @owner

    blueprint = blueprints(:draft_one)
    get new_post_url(blueprint_id: blueprint.id)

    assert_response :success
  end

  test "should get edit" do
    sign_in @owner

    get edit_post_url(@unpublished_post)
    assert_response :success
  end

  # Guards

  test "should redirect new with already posted blueprint" do
    sign_in @owner

    blueprint = blueprints(:one) # post: one が付いている
    get new_post_url(blueprint_id: blueprint.id)

    assert_redirected_to blueprint_url(blueprint)
  end
end
