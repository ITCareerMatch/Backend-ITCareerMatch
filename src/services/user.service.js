import userRepository from "../repositories/user.repository.js";
import { supabase } from "../lib/supabase.js";

class UserService {
  async getUserById(id) {
    return userRepository.findById(id);
  }

  async updateUserById(id, update) {
    return userRepository.updateById(id, update);
  }

  async deleteUserById(id) {
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      throw new Error(
        `Failed to delete user from Supabase Auth: ${error.message}`,
      );
    }

    return userRepository.deleteById(id);
  }
}

export default new UserService();
