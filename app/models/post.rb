# == Schema Information
#
# Table name: posts
#
#  id           :bigint           not null, primary key
#  caption      :text             not null
#  is_published :boolean          default(FALSE), not null
#  title        :string           not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  user_id      :bigint           not null
#
# Indexes
#
#  index_posts_on_created_at  (created_at)
#  index_posts_on_user_id     (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class Post < ApplicationRecord
  belongs_to :user

  has_many :comments, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :bookmarked_users, through: :bookmarks, source: :user

  has_one :blueprint, dependent: :destroy

  has_one_attached :image

  validates :title, presence: true
  validates :caption, presence: true

  scope :published, -> { where(is_published: true) }
end
