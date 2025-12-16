require "test_helper"

class BlueprintsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @owner = users(:one)
    @other = users(:two)
    @draft = blueprints(:draft_one)
  end

  test "should redirect new when not signed in" do
    get new_blueprint_url
    assert_response :redirect
  end

  test "owner can create and redirect to new post (private by default)" do
    sign_in @owner

    assert_difference("Blueprint.count", 1) do
      post blueprints_url, params: {
        blueprint: {
          name: "新しい手配書",
          editor_state: {} # Hashならassign_editor_state_from_paramはそのまま通る
        },
        transition: "to_post_private"
      }
    end

    blueprint = Blueprint.order(:id).last
    assert_equal @owner.id, blueprint.user_id
    assert_nil blueprint.post_id
    assert_redirected_to new_post_url(blueprint_id: blueprint.id, publish: "0")
  end

  test "owner can create and redirect to new post (public)" do
    sign_in @owner

    post blueprints_url, params: {
      blueprint: {
        name: "新しい手配書",
        editor_state: {}
      },
      transition: "to_post_public"
    }

    blueprint = Blueprint.order(:id).last
    assert_redirected_to new_post_url(blueprint_id: blueprint.id, publish: "1")
  end

  test "owner can update and redirect to new post (private by default)" do
    sign_in @owner

    patch blueprint_url(@draft), params: {
      blueprint: { name: "更新後" },
      transition: "to_post_private"
    }

    assert_redirected_to new_post_url(blueprint_id: @draft.id, publish: "0")
    @draft.reload
    assert_equal "更新後", @draft.name
  end

  test "non-owner cannot edit/update blueprint (404)" do
    sign_in users(:two)

    get posts_url
    assert_response :success

    get edit_blueprint_url(blueprints(:draft_one))
    assert_response :not_found

    patch blueprint_url(blueprints(:draft_one)), params: {
      blueprint: { name: "Hacked" }
    }
    assert_response :not_found
  end

  test "owner can apply post image update for posted blueprint and redirect to post" do
    sign_in @owner

    posted = blueprints(:one) # post あり :contentReference[oaicite:1]{index=1}

    patch blueprint_url(posted), params: {
      blueprint: { name: "Updated" },
      transition: "apply_post_image"
    }

    assert_redirected_to post_url(posted.post)
  end

  test "apply_post_image on draft blueprint does not error and follows default redirect" do
    sign_in @owner

    patch blueprint_url(@draft), params: {
      blueprint: { name: "Updated" },
      transition: "apply_post_image"
    }

    # draft は post なしなので default は new_post_path(..., publish: "0") へ
    assert_redirected_to new_post_url(blueprint_id: @draft.id, publish: "0")
  end
end
