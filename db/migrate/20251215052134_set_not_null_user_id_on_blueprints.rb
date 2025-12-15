class SetNotNullUserIdOnBlueprints < ActiveRecord::Migration[7.2]
  def change
    change_column_null :blueprints, :user_id, false
  end
end
