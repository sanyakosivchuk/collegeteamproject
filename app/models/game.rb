class Game < ApplicationRecord
    before_create :assign_uuid

    def to_param
      uuid
    end

    private

    def assign_uuid
      self.uuid ||= SecureRandom.uuid
    end
end
