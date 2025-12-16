class AddUserToBlueprints < ActiveRecord::Migration[7.2]
  def change
    add_reference :blueprints, :user, foreign_key: true, index: true, null: true
  end
end
