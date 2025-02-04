class Game < ApplicationRecord
    before_create :assign_uuid

    private

    def assign_uuid
      self.uuid ||= SecureRandom.uuid
    end

    def to_param
      uuid
    end
end
