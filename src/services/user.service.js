import userRepository from "../repositories/user.repository.js";
import cvRepository from "../repositories/cv.repository.js";
import { supabase } from "../lib/supabase.js";
import { cleanupUserQueueJobs } from "../lib/queue.js";

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
    const user = await userRepository.findById(id);
    const cvArchives = await cvRepository.getCvArchivesByUserId(id);

    if (user?.avatar_url) {
      try {
        const avatarPath = user.avatar_url.split(
          "/storage/v1/object/public/avatars/",
        )[1];
        if (avatarPath) {
          await supabase.storage.from("avatars").remove([avatarPath]);
          console.log(`✓ Deleted avatar for user ${id}`);
        }
      } catch (storageError) {
        console.error(
          `Warning: Failed to delete avatar for user ${id}:`,
          storageError,
        );
      }
    }

    for (const cv of cvArchives) {
      if (!cv?.file_url) {
        continue;
      }

      try {
        const { error: cvStorageError } = await supabase.storage
          .from("cv-uploads")
          .remove([cv.file_url]);

        if (cvStorageError) {
          throw cvStorageError;
        }

        console.log(`✓ Deleted CV file for user ${id}, cv ${cv.id}`);
      } catch (storageError) {
        console.error(
          `Warning: Failed to delete CV file for user ${id}, cv ${cv.id}:`,
          storageError,
        );
      }
    }

    try {
      await cleanupUserQueueJobs(
        id,
        cvArchives.map((cv) => cv.id),
      );
    } catch (queueError) {
      console.error(
        `Warning: Failed to clean queue jobs for user ${id}:`,
        queueError,
      );
    }

    await cvRepository.deleteCvDataByUserId(id);
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      throw new Error(
        `Failed to delete user from Supabase Auth: ${authError.message}`,
      );
    }

    return userRepository.deleteById(id);
  }
}

export default new UserService();
