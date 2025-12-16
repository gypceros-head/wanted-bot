class AddNameAndIsAdminToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :name, :string, null: false
    add_column :users, :is_admin, :boolean, null: false, default: false
  end
end
