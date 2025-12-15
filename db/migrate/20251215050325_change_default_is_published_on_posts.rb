class ChangeDefaultIsPublishedOnPosts < ActiveRecord::Migration[7.2]
  def up
    change_column_default :posts, :is_published, from: true, to: false
  end

  def down
    change_column_default :posts, :is_published, from: false, to: true
  end
end
