class MakeBlueprintPostOptional < ActiveRecord::Migration[7.2]
  def change
    change_column_null :blueprints, :post_id, true
  end
end
