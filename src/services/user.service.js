import userRepository from "../repositories/user.repository.js";
import { supabase } from "../lib/supabase.js";

class UserService {
  async getUserById(id) {
    return userRepository.findById(id);
  }

  async updateUserById(id, body, file) {
    const updateData = { ...body };

    if (file) {
      const existingUser = await userRepository.findById(id);

      const fileExtension = file.originalname.split(".").pop();
      const fileName = `avatars/${id}-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      if (existingUser?.avatar_url) {
        const oldPath = existingUser.avatar_url.split(
          "/storage/v1/object/public/avatars/",
        )[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      updateData.avatar_url = publicUrlData.publicUrl;
    }

    return userRepository.updateById(id, updateData);
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
